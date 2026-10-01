import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
} from '@mui/material';

/**
 * ReportTable Component
 * Displays report data in a table format
 * 
 * @param {Object} props
 * @param {Array} props.data - Table data array
 * @param {Array} props.columns - Column configuration [{ key, label, align, format }]
 * @param {string} props.title - Table title
 */
const ReportTable = ({ data = [], columns = [], title }) => {
  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      </Paper>
    );
  }

  const formatValue = (value, format) => {
    if (value === null || value === undefined) return '-';
    
    if (format === 'currency') {
      return `KES ${value?.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    
    if (format === 'date') {
      if (typeof value === 'string' && value.includes('-')) {
        return new Date(value).toLocaleDateString();
      }
      return value;
    }
    
    if (format === 'number') {
      return value?.toLocaleString();
    }
    
    if (format === 'percentage') {
      return `${value?.toFixed(2)}%`;
    }
    
    return value;
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      {title && (
        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'left'}
                  sx={{ fontWeight: 'bold' }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index} hover>
                {columns.map((column) => (
                  <TableCell key={column.key} align={column.align || 'left'}>
                    {formatValue(row[column.key], column.format)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ReportTable;

