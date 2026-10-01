import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container } from '@mui/material';
import { Add, SwapHoriz } from '@mui/icons-material';

/**
 * Stock Transfers Landing Page
 * Main entry point for stock transfers with nested routes
 */
const StockTransfers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isChildRoute = location.pathname !== '/stock-transfers';

  // If on a child route, render the outlet
  if (isChildRoute) {
    return <Outlet />;
  }

  // Otherwise show the main landing page
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SwapHoriz sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Stock Transfers
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => navigate('/stock-transfers/create-request')}
            >
              Create Transfer Request
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/stock-transfers/create')}
            >
              Create Direct Transfer
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" color="text.secondary" paragraph>
            Manage stock transfers between warehouses. Create direct transfers for immediate movement
            or use the request-based workflow for controlled transfers with approval.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/stock-transfers/list')}
            sx={{ minWidth: 200 }}
          >
            View All Transfers
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/stock-transfers/create-request')}
            sx={{ minWidth: 200 }}
          >
            Create Transfer Request
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/stock-transfers/create')}
            sx={{ minWidth: 200 }}
          >
            Create Direct Transfer
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default StockTransfers;

