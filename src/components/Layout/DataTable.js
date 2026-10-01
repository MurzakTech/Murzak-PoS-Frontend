import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  CircularProgress,
  Skeleton,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { InboxOutlined } from '@mui/icons-material';

/**
 * DataTable Component
 * Modern, minimal table for list pages with loading states and pagination
 */
const DataTable = ({
  columns = [],
  rows = [],
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon: EmptyIcon = InboxOutlined,
  pagination = null,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  rowKey = 'id',
  stickyHeader = false,
  maxHeight,
  skeletonRows = 5,
}) => {
  const theme = useTheme();

  // Normalize pagination props to handle both snake_case and camelCase
  const normalizedPagination = pagination ? (() => {
    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize || pagination.page_size || 10);
    const totalItems = Number(pagination.totalItems || pagination.total || 0);
    
    // Calculate totalPages if not provided or is 0
    let totalPages = Number(pagination.totalPages || pagination.total_pages || 0);
    if (totalPages === 0 && totalItems > 0 && pageSize > 0) {
      totalPages = Math.ceil(totalItems / pageSize);
    }
    
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('DataTable Pagination Debug:', {
        original: pagination,
        normalized: { page, pageSize, totalItems, totalPages },
        willShow: totalPages > 1,
        rowsCount: rows.length,
      });
    }
    
    return {
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  })() : null;

  // Loading skeleton rows
  const renderSkeletonRows = () => {
    return Array.from({ length: skeletonRows }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        {columns.map((column, colIndex) => (
          <TableCell key={`skeleton-${index}-${colIndex}`} align={column.align || 'left'}>
            <Skeleton
              variant="text"
              width={column.skeletonWidth || '80%'}
              height={20}
            />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  // Empty state
  const renderEmptyState = () => (
    <TableRow>
      <TableCell colSpan={columns.length} align="center" sx={{ py: 6, border: 'none' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <EmptyIcon
            sx={{
              fontSize: '2.5rem',
              color: 'text.disabled',
              opacity: 0.5,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );

  // Render cell content
  const renderCellContent = (column, row) => {
    if (column.render) {
      return column.render(row[column.field], row);
    }

    const value = column.field ? row[column.field] : null;

    if (value === null || value === undefined) {
      return (
        <Typography variant="body2" color="text.disabled">
          -
        </Typography>
      );
    }

    return value;
  };

  return (
    <Box>
      <TableContainer
        sx={{
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          position: 'relative',
          ...(maxHeight && { maxHeight, overflowY: 'auto' }),
        }}
      >
        {/* Loading Overlay */}
        {loading && rows.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: alpha(theme.palette.background.paper, 0.7),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}

        <Table stickyHeader={stickyHeader} size="small">
          <TableHead>
            <TableRow>
              {columns.map((column, index) => (
                <TableCell
                  key={column.field || index}
                  align={column.align || 'left'}
                  sx={{
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    ...column.headerSx,
                  }}
                >
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && rows.length === 0 ? (
              renderSkeletonRows()
            ) : rows.length === 0 ? (
              renderEmptyState()
            ) : (
              rows.map((row, rowIndex) => (
                <TableRow
                  key={row[rowKey] || rowIndex}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:last-child td': {
                      borderBottom: 'none',
                    },
                  }}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={`${row[rowKey] || rowIndex}-${column.field || colIndex}`}
                      align={column.align || 'left'}
                      sx={{
                        ...column.cellSx,
                      }}
                    >
                      {renderCellContent(column, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {normalizedPagination && normalizedPagination.totalItems > 0 && (
        <TablePagination
          component="div"
          count={normalizedPagination.totalItems}
          page={normalizedPagination.page - 1} // TablePagination uses 0-indexed pages
          onPageChange={(event, newPage) => {
            // Convert from 0-indexed (TablePagination) to 1-indexed (API)
            if (onPageChange) {
              onPageChange(event, newPage + 1);
            }
          }}
          rowsPerPage={normalizedPagination.pageSize}
          onRowsPerPageChange={(event) => {
            const newPageSize = parseInt(event.target.value, 10);
            if (onRowsPerPageChange) {
              onRowsPerPageChange(event, newPageSize);
            }
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Rows per page:"
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            '& .MuiTablePagination-toolbar': {
              px: 1,
            },
            '& .MuiTablePagination-selectLabel': {
              fontSize: '0.875rem',
            },
            '& .MuiTablePagination-displayedRows': {
              fontSize: '0.875rem',
            },
            '& .MuiTablePagination-select': {
              fontSize: '0.875rem',
            },
          }}
        />
      )}
    </Box>
  );
};

export default DataTable;
