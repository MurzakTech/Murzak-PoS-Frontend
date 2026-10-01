import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  GridLegacy as Grid,
  Container,
} from '@mui/material';

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/inventory';

  // If on a child route, only render the outlet
  if (isChildRoute) {
    return <Outlet />;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Inventory Operations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage stock movements, view summaries, and track inventory across warehouses
          </Typography>
        </Box>

        {/* Organized Sections */}
        <Grid container spacing={3}>
          {/* Stock Reports & Analysis */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Reports & Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/stock-summary')}
                >
                  <Typography variant="h6" gutterBottom>
                    Stock Summary
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View stock levels across warehouses
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/low-stock')}
                >
                  <Typography variant="h6" gutterBottom>
                    Low Stock Alert
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Items below threshold
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/stock-ledger')}
                >
                  <Typography variant="h6" gutterBottom>
                    Stock Ledger
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Transaction history
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/item-details')}
                >
                  <Typography variant="h6" gutterBottom>
                    Inventory Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Warehouse-specific details
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Stock Movements */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Stock Movements
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/stock-entries')}
                >
                  <Typography variant="h6" gutterBottom>
                    Stock Entries
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View all stock transactions
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/material-receipts')}
                >
                  <Typography variant="h6" gutterBottom>
                    Material Receipts
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View and create receipts
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/material-issues')}
                >
                  <Typography variant="h6" gutterBottom>
                    Material Issues
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View and create issues
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/material-transfers')}
                >
                  <Typography variant="h6" gutterBottom>
                    Material Transfers
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View and create transfers
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Stock Management */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Stock Management
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/stock-entry')}
                >
                  <Typography variant="h6" gutterBottom>
                    Stock Entry
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Advanced stock entry (Manufacture, Repack, etc.)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Paper
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => navigate('/inventory/stock-reconciliation')}
                >
                  <Typography variant="h6" gutterBottom>
                    Stock Reconciliation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adjust stock to physical count
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

    </Box>
    </Container>
  );
};

export default Inventory;
