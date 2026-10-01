import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  Tooltip,
  Button,
  alpha,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Search, Clear, FilterList, Close } from '@mui/icons-material';

/**
 * FilterBar Component
 * Modern, minimal filter bar for list pages
 */
const FilterBar = ({
  searchValue = '',
  searchPlaceholder = 'Search...',
  onSearchChange,
  filters = [],
  onFilterChange,
  onClearFilters,
  showClearButton = true,
  children,
}) => {
  const theme = useTheme();

  // Calculate active filter count
  const activeFilterCount = filters.filter((f) => {
    if (f.type === 'select') return f.value && f.value !== '';
    if (f.type === 'text') return f.value && f.value !== '';
    if (f.type === 'switch') return f.value === true;
    return false;
  }).length + (searchValue ? 1 : 0);

  const handleSearchChange = (e) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const handleSearchClear = () => {
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const handleFilterChange = (filterKey, value) => {
    if (onFilterChange) {
      onFilterChange(filterKey, value);
    }
  };

  const filterContainerSx = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1.5,
    alignItems: 'center',
    p: 1.5,
    borderRadius: 1,
    border: 1,
    borderColor: 'divider',
    backgroundColor: 'background.paper',
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: alpha(theme.palette.background.default, 0.5),
      '&:hover': {
        backgroundColor: theme.palette.background.default,
      },
    },
  };

  return (
    <Box sx={filterContainerSx}>
      {/* Filter Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          color: 'text.secondary',
          pr: 0.5,
        }}
      >
        <FilterList sx={{ fontSize: '1.125rem' }} />
      </Box>

      {/* Search Field */}
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={handleSearchChange}
        sx={{ minWidth: 180, ...inputSx }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: searchValue && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleSearchClear}>
                <Clear sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Dynamic Filters */}
      {filters.map((filter) => {
        if (filter.type === 'select') {
          return (
            <FormControl key={filter.key} size="small" sx={{ minWidth: filter.width || 140, ...inputSx }}>
              <InputLabel>{filter.label}</InputLabel>
              <Select
                value={filter.value || ''}
                label={filter.label}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              >
                <MenuItem value="">{filter.allLabel || 'All'}</MenuItem>
                {filter.options.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                  >
                    {filter.renderOption ? (
                      filter.renderOption(option)
                    ) : (
                      option.label
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

        if (filter.type === 'text') {
          return (
            <TextField
              key={filter.key}
              size="small"
              label={filter.label}
              placeholder={filter.placeholder}
              value={filter.value || ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              sx={{ minWidth: filter.width || 140, ...inputSx }}
            />
          );
        }

        if (filter.type === 'date') {
          return (
            <TextField
              key={filter.key}
              size="small"
              label={filter.label}
              type="date"
              value={filter.value || ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: filter.width || 140, ...inputSx }}
            />
          );
        }

        if (filter.type === 'chip') {
          return (
            <Chip
              key={filter.key}
              label={filter.label}
              onClick={() => handleFilterChange(filter.key, !filter.value)}
              color={filter.value ? 'primary' : 'default'}
              variant={filter.value ? 'filled' : 'outlined'}
              size="small"
              sx={{ fontWeight: 500 }}
            />
          );
        }

        return null;
      })}

      {/* Custom children (additional filters) */}
      {children}

      {/* Clear Filters Button */}
      {showClearButton && activeFilterCount > 0 && (
        <Button
          size="small"
          variant="text"
          color="inherit"
          startIcon={<Close sx={{ fontSize: '0.875rem' }} />}
          onClick={onClearFilters}
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'none',
            px: 1,
            minWidth: 'auto',
            ml: 'auto',
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.08),
              color: 'error.main',
            },
          }}
        >
          Clear ({activeFilterCount})
        </Button>
      )}
    </Box>
  );
};

export default FilterBar;
