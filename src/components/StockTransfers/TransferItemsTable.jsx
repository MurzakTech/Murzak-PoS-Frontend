import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  getRemainingQuantity,
  isItemFullyReceived,
  isItemPartiallyReceived,
} from '../../utils/stockTransferHelpers';

/**
 * TransferItemsTable Component
 * Displays transfer items in a table format with quantities and status
 * 
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of transfer items
 * @param {boolean} [props.showRequested=true] - Show requested quantity column
 * @param {boolean} [props.showDispatched=true] - Show dispatched quantity column
 * @param {boolean} [props.showReceived=true] - Show received quantity column
 * @param {boolean} [props.showRemaining=true] - Show remaining quantity column
 * @param {string} [props.mode='view'] - Display mode: 'view', 'dispatch', 'receive'
 * @returns {JSX.Element} Items table component
 * 
 * @example
 * <TransferItemsTable items={request.items} />
 * <TransferItemsTable items={items} mode="dispatch" showReceived={false} />
 */
const TransferItemsTable = ({
  items = [],
  showRequested = true,
  showDispatched = true,
  showReceived = true,
  showRemaining = true,
  mode = 'view',
}) => {
  if (!items || items.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No items found
        </Typography>
      </Box>
    );
  }

  const getItemStatus = (item) => {
    if (isItemFullyReceived(item)) {
      return { label: 'Fully Received', color: 'success' };
    }
    if (isItemPartiallyReceived(item)) {
      return { label: 'Partially Received', color: 'warning' };
    }
    if (item.dispatched_qty > 0 && item.dispatched_qty < item.requested_qty) {
      return { label: 'Partially Dispatched', color: 'info' };
    }
    if (item.dispatched_qty > 0) {
      return { label: 'Dispatched', color: 'info' };
    }
    return { label: 'Pending', color: 'default' };
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Item Code
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" fontWeight="bold">
                Item Name
              </Typography>
            </TableCell>
            {showRequested && (
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold">
                  Requested Qty
                </Typography>
              </TableCell>
            )}
            {showDispatched && (
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold">
                  Dispatched Qty
                </Typography>
              </TableCell>
            )}
            {showReceived && (
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold">
                  Received Qty
                </Typography>
              </TableCell>
            )}
            {showRemaining && (
              <TableCell align="right">
                <Typography variant="subtitle2" fontWeight="bold">
                  Remaining
                </Typography>
              </TableCell>
            )}
            <TableCell align="center">
              <Typography variant="subtitle2" fontWeight="bold">
                Status
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => {
            const status = getItemStatus(item);
            const remaining = getRemainingQuantity(item);

            return (
              <TableRow key={item.item_code || index} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {item.item_code || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.item_name || item.item_code || 'N/A'}
                  </Typography>
                </TableCell>
                {showRequested && (
                  <TableCell align="right">
                    <Typography variant="body2">
                      {item.requested_qty || 0}
                    </Typography>
                  </TableCell>
                )}
                {showDispatched && (
                  <TableCell align="right">
                    <Typography variant="body2">
                      {item.dispatched_qty || 0}
                    </Typography>
                  </TableCell>
                )}
                {showReceived && (
                  <TableCell align="right">
                    <Typography variant="body2">
                      {item.received_qty || 0}
                    </Typography>
                  </TableCell>
                )}
                {showRemaining && (
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      color={remaining > 0 ? 'text.secondary' : 'success.main'}
                      fontWeight={remaining === 0 ? 600 : 400}
                    >
                      {remaining}
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">
                  <Chip
                    label={status.label}
                    color={status.color}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TransferItemsTable;

