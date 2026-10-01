import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Autocomplete,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import { Star, Search } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useLoyalty } from '../../hooks/useLoyalty';

/**
 * AssignLoyaltyProgram Component
 * 
 * Dialog component for assigning a loyalty program to a customer
 * 
 * @param {Object} props
 * @param {string} props.customerId - Customer ID (required)
 * @param {string} [props.currentProgram] - Currently assigned program name (optional)
 * @param {boolean} props.open - Whether dialog is open (required)
 * @param {Function} props.onClose - Callback when dialog closes (required)
 * @param {Function} [props.onSuccess] - Callback after successful assignment (optional)
 */
const AssignLoyaltyProgram = ({
  customerId,
  currentProgram,
  open,
  onClose,
  onSuccess,
}) => {
  const {
    programs,
    listPrograms,
    isLoadingPrograms,
    assignProgram,
    isAssigningProgram,
    error: assignError,
  } = useLoyalty({
    customerId,
    autoFetchBalance: false,
  });

  const [searchTerm, setSearchTerm] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      loyalty_program_name: '',
    },
  });

  const selectedProgramName = watch('loyalty_program_name');

  // Fetch programs when dialog opens
  useEffect(() => {
    if (open) {
      listPrograms(false); // Fetch all programs (active and inactive)
      reset({
        loyalty_program_name: currentProgram || '',
      });
      setSearchTerm('');
    }
  }, [open, reset, currentProgram, listPrograms]);

  // Filter programs based on search term
  const filteredPrograms = useMemo(() => {
    if (!programs || programs.length === 0) return [];
    
    if (!searchTerm.trim()) return programs;

    const searchLower = searchTerm.toLowerCase();
    return programs.filter((program) => {
      const programName = (program.loyalty_program_name || program.name || '').toLowerCase();
      const programType = (program.program_type || '').toLowerCase();
      const tierName = (program.tier_name || '').toLowerCase();
      
      return (
        programName.includes(searchLower) ||
        programType.includes(searchLower) ||
        tierName.includes(searchLower)
      );
    });
  }, [programs, searchTerm]);

  // Find selected program details
  const selectedProgram = useMemo(() => {
    if (!selectedProgramName || !programs) return null;
    return programs.find(
      (p) => (p.loyalty_program_name || p.name) === selectedProgramName
    );
  }, [selectedProgramName, programs]);

  const onSubmit = async (data) => {
    if (!customerId) {
      return;
    }

    try {
      const result = await assignProgram(customerId, data.loyalty_program_name);

      if (result.type === 'loyalty/assignLoyaltyProgram/fulfilled') {
        // Call success callback
        if (onSuccess) {
          onSuccess(result.payload);
        }

        // Close dialog
        onClose();

        // Reset form
        reset();
      }
    } catch (error) {
      // Error is handled by Redux and shown via notification
      console.error('Assignment error:', error);
    }
  };

  const handleClose = () => {
    if (!isAssigningProgram) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {currentProgram ? 'Change Loyalty Program' : 'Assign Loyalty Program'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Current Program Display */}
            {currentProgram && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: 'info.light',
                  border: '1px solid',
                  borderColor: 'info.main',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Star color="info" />
                  <Typography variant="subtitle2" fontWeight="medium">
                    Currently Assigned Program
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1" fontWeight="medium" color="info.dark">
                  {currentProgram}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Select a new program below to change the assignment
                </Typography>
              </Paper>
            )}

            {/* Error Alert */}
            {assignError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {assignError}
              </Alert>
            )}

            {/* Program Selection with Search */}
            <Box sx={{ mb: 2 }}>
              <Controller
                name="loyalty_program_name"
                control={control}
                rules={{
                  required: 'Loyalty program is required',
                }}
                render={({ field: { onChange, value, ...field } }) => (
                  <Autocomplete
                    {...field}
                    options={filteredPrograms}
                    value={
                      filteredPrograms.find(
                        (p) => (p.loyalty_program_name || p.name) === value
                      ) || null
                    }
                    getOptionLabel={(option) =>
                      option.loyalty_program_name || option.name || ''
                    }
                    isOptionEqualToValue={(option, val) =>
                      (option.loyalty_program_name || option.name) ===
                      (val.loyalty_program_name || val.name)
                    }
                    loading={isLoadingPrograms}
                    onInputChange={(event, newInputValue) => {
                      setSearchTerm(newInputValue);
                    }}
                    onChange={(event, newValue) => {
                      onChange(newValue ? (newValue.loyalty_program_name || newValue.name) : '');
                    }}
                    disabled={isAssigningProgram}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search and Select Loyalty Program"
                        placeholder="Type to search programs..."
                        required
                        error={!!errors.loyalty_program_name}
                        helperText={
                          errors.loyalty_program_name?.message ||
                          'Search and select a loyalty program to assign'
                        }
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                          endAdornment: (
                            <>
                              {isLoadingPrograms ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const programName = option.loyalty_program_name || option.name || 'Unknown';
                      const isActive = option.active === 1 || option.active === true;
                      const pointsPerUnit = option.points_per_unit || option.collection_factor || 'N/A';
                      const programType = option.program_type || 'Standard';
                      
                      return (
                        <Box component="li" {...props} key={option.name || programName}>
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body1" fontWeight="medium">
                                {programName}
                              </Typography>
                              <Chip
                                label={isActive ? 'Active' : 'Inactive'}
                                color={isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                <strong>Points/Unit:</strong> {pointsPerUnit}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                <strong>Type:</strong> {programType}
                              </Typography>
                              {option.tier_name && (
                                <Typography variant="caption" color="text.secondary">
                                  <strong>Tier:</strong> {option.tier_name}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    }}
                    noOptionsText={
                      isLoadingPrograms
                        ? 'Loading programs...'
                        : searchTerm.trim()
                        ? 'No programs found matching your search'
                        : 'No loyalty programs available'
                    }
                  />
                )}
              />
            </Box>

            {/* Selected Program Details */}
            {selectedProgram && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: 'primary.light',
                  border: '1px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Star color="primary" />
                  <Typography variant="subtitle2" fontWeight="medium">
                    Selected Program Details
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Program Name
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedProgram.loyalty_program_name || selectedProgram.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Points Per Unit
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedProgram.points_per_unit || selectedProgram.collection_factor || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Program Type
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {selectedProgram.program_type || 'Standard'}
                    </Typography>
                  </Grid>
                  {selectedProgram.tier_name && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Tier Name
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {selectedProgram.tier_name}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* Programs Count Info */}
            {programs && programs.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {filteredPrograms.length} of {programs.length} program{programs.length !== 1 ? 's' : ''} available
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={isAssigningProgram}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isAssigningProgram}
            startIcon={isAssigningProgram ? <CircularProgress size={18} /> : null}
          >
            {isAssigningProgram
              ? 'Assigning...'
              : currentProgram
              ? 'Update Program'
              : 'Assign Program'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AssignLoyaltyProgram;

