import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import { Add, Star, Refresh } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useLoyalty } from '../../hooks/useLoyalty';
import PageHeader from '../../components/Layout/PageHeader';
import FilterBar from '../../components/Layout/FilterBar';
import DataTable from '../../components/Layout/DataTable';
import StatusChip from '../../components/Layout/StatusChip';

const LoyaltyPrograms = () => {
  const {
    programs,
    listPrograms,
    createProgram,
    isCreatingProgram,
    isLoadingPrograms,
    error: createError,
  } = useLoyalty();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch programs on mount and when filter changes
  useEffect(() => {
    listPrograms(activeOnlyFilter);
  }, [listPrograms, activeOnlyFilter]);

  // Filter and format programs for table
  const filteredPrograms = useMemo(() => {
    if (!programs || programs.length === 0) return [];

    let filtered = programs;

    // Filter by active status if activeOnlyFilter is enabled
    if (activeOnlyFilter) {
      filtered = filtered.filter((program) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const normalizeDate = (dateString) => {
          if (!dateString) return null;
          try {
            const parts = dateString.split('-');
            if (parts.length === 3) {
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              return new Date(year, month, day);
            }
            const date = new Date(dateString);
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
          } catch {
            return null;
          }
        };

        const fromDate = normalizeDate(program.from_date);
        const toDate = normalizeDate(program.to_date);

        let isActive = true;
        if (fromDate && today < fromDate) {
          isActive = false;
        }
        if (toDate && isActive && today > toDate) {
          isActive = false;
        }

        return isActive;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((program) => {
        const programName = (program.loyalty_program_name || program.name || '').toLowerCase();
        const programType = (program.loyalty_program_type || program.program_type || '').toLowerCase();
        const tierName = (program.tier_name || '').toLowerCase();
        return (
          programName.includes(searchLower) ||
          programType.includes(searchLower) ||
          tierName.includes(searchLower)
        );
      });
    }

    return filtered;
  }, [programs, activeOnlyFilter, searchTerm]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Check if program is active
  const isProgramActive = (program) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizeDate = (dateString) => {
      if (!dateString) return null;
      try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
        const date = new Date(dateString);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      } catch {
        return null;
      }
    };

    const fromDate = normalizeDate(program.from_date);
    const toDate = normalizeDate(program.to_date);

    let isActive = true;
    if (fromDate && today < fromDate) {
      isActive = false;
    }
    if (toDate && isActive && today > toDate) {
      isActive = false;
    }

    return isActive;
  };

  // Define table columns
  const columns = useMemo(
    () => [
      {
        field: 'loyalty_program_name',
        header: 'Program Name',
        minWidth: 200,
        render: (value, row) => (
          <Typography variant="body2" fontWeight={500}>
            {value || row.name || 'Unnamed Program'}
          </Typography>
        ),
      },
      {
        field: 'loyalty_program_type',
        header: 'Program Type',
        minWidth: 150,
        render: (value, row) => (
          <Typography variant="body2" color="text.secondary">
            {value || row.program_type || '-'}
          </Typography>
        ),
      },
      {
        field: 'tier_name',
        header: 'Tier',
        minWidth: 100,
        render: (value) =>
          value ? (
            <Chip label={value} size="small" variant="outlined" color="primary" />
          ) : (
            <Typography variant="body2" color="text.disabled">
              -
            </Typography>
          ),
      },
      {
        field: 'status',
        header: 'Status',
        minWidth: 100,
        align: 'center',
        render: (value, row) => {
          const active = isProgramActive(row);
          return <StatusChip status={active ? 'active' : 'inactive'} label={active ? 'Active' : 'Inactive'} />;
        },
      },
      {
        field: 'from_date',
        header: 'Valid Period',
        minWidth: 200,
        render: (value, row) => {
          const fromDate = value || row.from_date;
          const toDate = row.to_date;
          if (!fromDate && !toDate) {
            return (
              <Typography variant="body2" color="text.disabled">
                Unlimited
              </Typography>
            );
          }
          return (
            <Typography variant="body2" color="text.secondary">
              {fromDate ? formatDate(fromDate) : 'No start'} - {toDate ? formatDate(toDate) : 'No end'}
            </Typography>
          );
        },
      },
      {
        field: 'conversion_factor',
        header: 'Conversion Factor',
        minWidth: 150,
        align: 'right',
        render: (value, row) => {
          const factor = value || row.conversion_factor;
          if (factor === null || factor === undefined || factor === '') {
            return (
              <Typography variant="body2" color="text.disabled">
                -
              </Typography>
            );
          }
          return (
            <Typography variant="body2">
              1 point = {parseFloat(factor).toFixed(4)}
            </Typography>
          );
        },
      },
      {
        field: 'expiry_duration',
        header: 'Expiry (Days)',
        minWidth: 120,
        align: 'right',
        render: (value, row) => {
          const duration = value || row.expiry_duration;
          if (duration === null || duration === undefined || duration === '') {
            return (
              <Typography variant="body2" color="text.disabled">
                -
              </Typography>
            );
          }
          return (
            <Typography variant="body2">
              {parseInt(duration, 10)} days
            </Typography>
          );
        },
      },
    ],
    []
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      pointsPerUnit: '',
      programType: 'Single Tier Program',
      tierName: 'Bronze',
      fromDate: '',
      toDate: '',
      conversionFactor: '',
      expenseAccount: '',
      costCenter: '',
      expiryDuration: '',
    },
  });

  const handleCreateOpen = () => {
    reset({
      name: '',
      pointsPerUnit: '',
      programType: 'Single Tier Program',
      tierName: 'Bronze',
      fromDate: '',
      toDate: '',
      conversionFactor: '',
      expenseAccount: '',
      costCenter: '',
      expiryDuration: '',
    });
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setCreateDialogOpen(false);
    reset();
  };

  const onSubmit = async (data) => {
    try {
      const result = await createProgram({
        name: data.name,
        pointsPerUnit: parseFloat(data.pointsPerUnit),
        programType: data.programType,
        tierName: data.tierName,
        fromDate: data.fromDate || null,
        toDate: data.toDate || null,
        conversionFactor: data.conversionFactor ? parseFloat(data.conversionFactor) : null,
        expenseAccount: data.expenseAccount || null,
        costCenter: data.costCenter || null,
        expiryDuration: data.expiryDuration ? parseInt(data.expiryDuration, 10) : null,
      });

      if (result.type === 'loyalty/createLoyaltyProgram/fulfilled') {
        handleCreateClose();
        // Refresh the programs list to include the newly created program
        listPrograms(activeOnlyFilter);
      }
    } catch (error) {
      console.error('Error creating loyalty program:', error);
    }
  };

  const totalPrograms = filteredPrograms.length;
  const activePrograms = filteredPrograms.filter((p) => isProgramActive(p)).length;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <PageHeader
          title="Loyalty Programs"
          subtitle="Create and manage loyalty programs for your customers"
          icon={Star}
          stats={[
            { value: totalPrograms, label: 'Total', color: 'primary.main' },
            { value: activePrograms, label: 'Active', color: 'success.main' },
          ]}
          actions={[
            {
              label: 'Create Program',
              icon: <Add />,
              onClick: handleCreateOpen,
              variant: 'contained',
            },
            {
              type: 'icon',
              icon: <Refresh />,
              onClick: () => listPrograms(activeOnlyFilter),
              disabled: isLoadingPrograms,
              tooltip: 'Refresh',
            },
          ]}
          loading={isLoadingPrograms && programs.length === 0}
        />

        <Box sx={{ mb: 2 }}>
          <FilterBar
            searchValue={searchTerm}
            searchPlaceholder="Search programs by name, type, or tier..."
            onSearchChange={setSearchTerm}
            filters={[
              {
                key: 'activeOnly',
                label: 'Active Only',
                type: 'chip',
                value: activeOnlyFilter,
              },
            ]}
            onFilterChange={(key, value) => {
              if (key === 'activeOnly') {
                setActiveOnlyFilter(value);
              }
            }}
            onClearFilters={() => {
              setSearchTerm('');
              setActiveOnlyFilter(true);
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={activeOnlyFilter}
                  onChange={(e) => setActiveOnlyFilter(e.target.checked)}
                  disabled={isLoadingPrograms}
                  size="small"
                />
              }
              label="Active Only"
              sx={{ ml: 1 }}
            />
          </FilterBar>
        </Box>

        <DataTable
          columns={columns}
          rows={filteredPrograms}
          loading={isLoadingPrograms}
          emptyMessage="No loyalty programs found"
          emptyIcon={Star}
          rowKey={(row) => row.name || row.loyalty_program_name || Math.random()}
        />

        {/* Create Program Dialog */}
        <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle>Create Loyalty Program</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 1 }}>
                {/* Error Alert */}
                {createError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {createError}
                  </Alert>
                )}

                <Grid container spacing={2}>
                  {/* Program Name */}
                  <Grid item xs={12}>
                    <Controller
                      name="name"
                      control={control}
                      rules={{
                        required: 'Program name is required',
                        minLength: {
                          value: 1,
                          message: 'Program name cannot be empty',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Program Name"
                          fullWidth
                          required
                          error={!!errors.name}
                          helperText={errors.name?.message}
                          disabled={isCreatingProgram}
                          autoFocus
                        />
                      )}
                    />
                  </Grid>

                  {/* Points Per Unit */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="pointsPerUnit"
                      control={control}
                      rules={{
                        required: 'Points per unit is required',
                        validate: (value) => {
                          const num = parseFloat(value);
                          if (isNaN(num) || num <= 0) {
                            return 'Points per unit must be a positive number';
                          }
                          return true;
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Points Per Unit (Collection Factor)"
                          type="number"
                          fullWidth
                          required
                          error={!!errors.pointsPerUnit}
                          helperText={
                            errors.pointsPerUnit?.message ||
                            'Currency units required per point (e.g., 10 = 1 point per 10 units)'
                          }
                          disabled={isCreatingProgram}
                          inputProps={{
                            min: 0.01,
                            step: 0.01,
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Program Type */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="programType"
                      control={control}
                      rules={{ required: 'Program type is required' }}
                      render={({ field }) => (
                        <FormControl fullWidth required error={!!errors.programType}>
                          <InputLabel>Program Type</InputLabel>
                          <Select {...field} label="Program Type" disabled={isCreatingProgram}>
                            <MenuItem value="Single Tier Program">Single Tier Program</MenuItem>
                            <MenuItem value="Tiered">Tiered</MenuItem>
                            <MenuItem value="Points Only">Points Only</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  {/* Tier Name */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="tierName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Tier Name"
                          fullWidth
                          helperText="Default tier for collection rules (e.g., Bronze, Silver, Gold)"
                          disabled={isCreatingProgram}
                        />
                      )}
                    />
                  </Grid>

                  {/* From Date */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="fromDate"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="From Date (Optional)"
                          type="date"
                          fullWidth
                          helperText="Start date for limited tenure program (YYYY-MM-DD)"
                          disabled={isCreatingProgram}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* To Date */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="toDate"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="To Date (Optional)"
                          type="date"
                          fullWidth
                          helperText="End date for limited tenure program (YYYY-MM-DD). Leave empty for unlimited."
                          disabled={isCreatingProgram}
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Conversion Factor */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="conversionFactor"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (!value) return true; // Optional field
                          const num = parseFloat(value);
                          if (isNaN(num) || num < 0) {
                            return 'Conversion factor must be a non-negative number';
                          }
                          return true;
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Conversion Factor (Optional)"
                          type="number"
                          fullWidth
                          helperText={
                            errors.conversionFactor?.message ||
                            'Currency value per point for redemption (e.g., 0.01 = 1 point = 0.01 currency)'
                          }
                          error={!!errors.conversionFactor}
                          disabled={isCreatingProgram}
                          inputProps={{
                            min: 0,
                            step: 0.0001,
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Expiry Duration */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="expiryDuration"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (!value) return true; // Optional field
                          const num = parseInt(value, 10);
                          if (isNaN(num) || num <= 0) {
                            return 'Expiry duration must be a positive integer (days)';
                          }
                          return true;
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Expiry Duration (Optional)"
                          type="number"
                          fullWidth
                          helperText={
                            errors.expiryDuration?.message ||
                            'Number of days before points expire (e.g., 365 = 1 year)'
                          }
                          error={!!errors.expiryDuration}
                          disabled={isCreatingProgram}
                          inputProps={{
                            min: 1,
                            step: 1,
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Expense Account */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="expenseAccount"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Expense Account (Optional)"
                          fullWidth
                          helperText="Account for loyalty redemption expense (e.g., 'Loyalty Redemption - Company')"
                          disabled={isCreatingProgram}
                        />
                      )}
                    />
                  </Grid>

                  {/* Cost Center */}
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="costCenter"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Cost Center (Optional)"
                          fullWidth
                          helperText="Cost center for loyalty redemption (e.g., 'Main - Company')"
                          disabled={isCreatingProgram}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCreateClose} disabled={isCreatingProgram}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isCreatingProgram}
                startIcon={isCreatingProgram ? <CircularProgress size={18} /> : null}
              >
                {isCreatingProgram ? 'Creating...' : 'Create Program'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Container>
  );
};

export default LoyaltyPrograms;

