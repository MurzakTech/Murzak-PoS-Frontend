import React from 'react';
import { TextField, Grid } from '@mui/material';

/**
 * DateRangePicker Component
 * Reusable date range selector for reports using native HTML date inputs
 * 
 * @param {Object} props
 * @param {string} props.startDate - Start date value (YYYY-MM-DD format)
 * @param {string} props.endDate - End date value (YYYY-MM-DD format)
 * @param {Function} props.onStartDateChange - Callback when start date changes
 * @param {Function} props.onEndDateChange - Callback when end date changes
 * @param {boolean} props.required - Whether dates are required
 * @param {string} props.startLabel - Label for start date field
 * @param {string} props.endLabel - Label for end date field
 */
const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  required = false,
  startLabel = 'Start Date',
  endLabel = 'End Date',
}) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label={startLabel}
          type="date"
          value={startDate || ''}
          onChange={(e) => onStartDateChange(e.target.value)}
          required={required}
          size="small"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            max: endDate || undefined,
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label={endLabel}
          type="date"
          value={endDate || ''}
          onChange={(e) => onEndDateChange(e.target.value)}
          required={required}
          size="small"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            min: startDate || undefined,
          }}
        />
      </Grid>
    </Grid>
  );
};

export default DateRangePicker;

