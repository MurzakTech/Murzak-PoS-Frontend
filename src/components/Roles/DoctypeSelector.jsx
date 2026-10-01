import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Typography,
  GridLegacy as Grid,
  InputAdornment,
  Button,
  Paper,
  Pagination,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';
import useSystemAPI from '../../hooks/useSystemAPI';

/**
 * DoctypeSelector Component
 * 
 * Provides a searchable, filterable interface for selecting doctypes.
 * Features:
 * - Module filtering
 * - Search with debouncing
 * - Autocomplete selection
 * - Doctype metadata display
 * - Pagination support
 * 
 * @param {Object} props
 * @param {string|null} props.selectedDoctype - Currently selected doctype name
 * @param {Function} props.onSelect - Callback when doctype is selected (doctype) => void
 * @param {string|null} props.module - Initial module filter
 * @param {Function} props.onModuleChange - Callback when module changes (module) => void
 * @param {boolean} props.showMetadata - Whether to show doctype metadata (default: true)
 */
const DoctypeSelector = ({
  selectedDoctype,
  onSelect,
  module: initialModule = null,
  onModuleChange,
  showMetadata = true,
}) => {
  const {
    modules,
    doctypes,
    isLoadingModules,
    isLoadingDoctypes,
    filters,
    pagination,
    listModules,
    listDoctypes,
    setFilters,
    setPagination,
  } = useSystemAPI();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState(initialModule);
  const [selectedDoctypeValue, setSelectedDoctypeValue] = useState(null);

  // Debounce search term (300ms delay)
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Load modules on mount
  useEffect(() => {
    listModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load doctypes when filters change
  useEffect(() => {
    // Only load if we have a module selected or a search term
    // This prevents loading all doctypes on initial mount
    if (selectedModule || debouncedSearch) {
      const loadDoctypes = async () => {
        await listDoctypes(
          {
            module: selectedModule,
            search: debouncedSearch || undefined,
          },
          {
            page: 1,
            pageSize: 20,
          }
        );
      };
      loadDoctypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModule, debouncedSearch]);

  // Update selected doctype value when prop changes
  useEffect(() => {
    if (selectedDoctype && doctypes.length > 0) {
      const doctype = doctypes.find((d) => d.name === selectedDoctype);
      setSelectedDoctypeValue(doctype || null);
    } else if (!selectedDoctype) {
      setSelectedDoctypeValue(null);
    }
    // Only update when selectedDoctype changes, not when doctypes array changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctype]);

  const handleModuleChange = (event) => {
    const newModule = event.target.value || null;
    setSelectedModule(newModule);
    setFilters({ module: newModule });
    setPagination({ page: 1 });
    if (onModuleChange) {
      onModuleChange(newModule);
    }
  };

  const handleSearchChange = (event, newValue) => {
    if (typeof newValue === 'string') {
      setSearchTerm(newValue);
      setFilters({ search: newValue });
      setPagination({ page: 1 });
    } else {
      // Autocomplete selection
      setSelectedDoctypeValue(newValue);
      if (newValue && onSelect) {
        onSelect(newValue.name);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setFilters({ search: '' });
    setPagination({ page: 1 });
  };

  const handlePageChange = (event, value) => {
    setPagination({ page: value });
    listDoctypes(
      {
        module: selectedModule,
        search: debouncedSearch || undefined,
      },
      {
        page: value,
        pageSize: pagination.pageSize,
      }
    );
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Module Selector */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Module</InputLabel>
            <Select
              value={selectedModule || ''}
              label="Module"
              onChange={handleModuleChange}
              disabled={isLoadingModules}
            >
              <MenuItem value="">
                <em>All Modules</em>
              </MenuItem>
              {modules.map((mod) => (
                <MenuItem key={mod.name || mod.module_name} value={mod.name || mod.module_name}>
                  {mod.module_name || mod.name} ({mod.doctype_count || 0})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Doctype Autocomplete */}
        <Grid item xs={12} md={8}>
          <Autocomplete
            options={doctypes}
            value={selectedDoctypeValue}
            getOptionLabel={(option) => option?.name || ''}
            isOptionEqualToValue={(option, value) => option?.name === value?.name}
            loading={isLoadingDoctypes}
            onChange={(event, newValue) => {
              setSelectedDoctypeValue(newValue);
              if (newValue && onSelect) {
                onSelect(newValue.name);
              }
            }}
            onInputChange={(event, newInputValue) => {
              setSearchTerm(newInputValue);
              setFilters({ search: newInputValue });
              setPagination({ page: 1 });
            }}
            inputValue={searchTerm}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search DocType"
                placeholder="Type to search doctypes..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {isLoadingDoctypes ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.name}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" fontWeight="medium">
                    {option.name}
                  </Typography>
                  {showMetadata && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={option.module || 'Unknown'}
                        size="small"
                        variant="outlined"
                      />
                      {option.is_submittable === 1 && (
                        <Chip label="Submittable" size="small" color="primary" />
                      )}
                      {option.custom === 1 && (
                        <Chip label="Custom" size="small" color="secondary" />
                      )}
                      {option.permission_count !== undefined && (
                        <Chip
                          label={`${option.permission_count} roles`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            )}
            noOptionsText={
              isLoadingDoctypes
                ? 'Loading...'
                : searchTerm
                ? 'No doctypes found'
                : 'Start typing to search'
            }
          />
        </Grid>
      </Grid>

      {/* Search Results Info */}
      {searchTerm && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {pagination.total > 0
              ? `Showing ${((pagination.page - 1) * pagination.pageSize) + 1} - ${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total
                )} of ${pagination.total} results`
              : 'No results found'}
            {searchTerm && ` for "${searchTerm}"`}
          </Typography>
          <Button
            size="small"
            startIcon={<Clear />}
            onClick={handleClearSearch}
            disabled={!searchTerm}
          >
            Clear
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            size="small"
          />
        </Box>
      )}

      {/* Selected Doctype Info */}
      {selectedDoctypeValue && showMetadata && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected: {selectedDoctypeValue.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip label={`Module: ${selectedDoctypeValue.module || 'Unknown'}`} size="small" />
            {selectedDoctypeValue.is_submittable === 1 && (
              <Chip label="Submittable" size="small" color="primary" />
            )}
            {selectedDoctypeValue.custom === 1 && (
              <Chip label="Custom" size="small" color="secondary" />
            )}
            {selectedDoctypeValue.permission_count !== undefined && (
              <Chip
                label={`${selectedDoctypeValue.permission_count} roles have permissions`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default DoctypeSelector;

