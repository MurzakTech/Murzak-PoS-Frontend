import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  GridLegacy as Grid,
  Card,
  CardContent,
  CardActionArea,
  Paper,
} from '@mui/material';
import {
  Category,
  CompareArrows,
  TrendingUp,
} from '@mui/icons-material';

const InventoryValuation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/reports/inventory-valuation';

  const reports = [
    {
      title: 'Value by Category',
      description: 'View inventory value breakdown by item category/group',
      icon: Category,
      color: '#2e7d32',
      path: '/reports/inventory-valuation/value-by-category',
      features: [
        'Total value by category',
        'Quantity breakdown',
        'Percentage distribution',
        'Item count per category',
      ],
    },
    {
      title: 'Cost Method Comparison',
      description: 'Compare inventory valuation using different cost methods (FIFO, LIFO, Weighted Average)',
      icon: CompareArrows,
      color: '#1976d2',
      path: '/reports/inventory-valuation/cost-method-comparison',
      features: [
        'FIFO valuation',
        'LIFO valuation',
        'Weighted Average',
        'Side-by-side comparison',
      ],
    },
    {
      title: 'Value Trends',
      description: 'Track historical inventory values over time with period grouping',
      icon: TrendingUp,
      color: '#ed6c02',
      path: '/reports/inventory-valuation/value-trends',
      features: [
        'Daily/Weekly/Monthly trends',
        'Value changes over time',
        'Percentage changes',
        'Historical analysis',
      ],
    },
  ];

  // If on a child route, render the outlet
  if (isChildRoute) {
    return <Outlet />;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Inventory Valuation Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analyze inventory value by category, compare cost methods, and track value trends over time
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reports.map((report) => {
          const IconComponent = report.icon;
          return (
            <Grid item xs={12} md={4} key={report.title}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(report.path)}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      width: '100%',
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: `${report.color}15`,
                        color: report.color,
                        borderRadius: 2,
                        p: 1.5,
                        mr: 2,
                      }}
                    >
                      <IconComponent sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {report.title}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, flexGrow: 1 }}
                  >
                    {report.description}
                  </Typography>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Features:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {report.features.map((feature, index) => (
                        <Box
                          key={index}
                          sx={{
                            bgcolor: 'action.hover',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                          }}
                        >
                          {feature}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default InventoryValuation;

