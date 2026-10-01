import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  GridLegacy as Grid,
  Paper,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  TrendingUp,
  Inventory2,
  SwapHoriz,
  Schedule,
  Analytics,
} from '@mui/icons-material';

const Reports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/reports';

  const reportCategories = [
    {
      title: 'Sales Analytics',
      description: 'Daily sales, revenue by category, and sales summaries',
      icon: TrendingUp,
      color: '#1976d2',
      path: '/reports/sales-analytics',
      reports: [
        'Sales Analytics Report',
        'Export Sales Analytics',
      ],
    },
    {
      title: 'Inventory Summary',
      description: 'Total stock quantity and value by warehouse',
      icon: Inventory2,
      color: '#0288d1',
      path: '/reports/inventory-summary',
      reports: [
        'Inventory Summary Report',
      ],
    },
    {
      title: 'Inventory Valuation',
      description: 'Value by category, cost method comparison, and value trends',
      icon: Inventory2,
      color: '#2e7d32',
      path: '/reports/inventory-valuation',
      reports: [
        'Value by Category',
        'Cost Method Comparison',
        'Value Trends',
      ],
    },
    {
      title: 'Stock Movement',
      description: 'Turnover rates, days on hand, and movement patterns',
      icon: SwapHoriz,
      color: '#ed6c02',
      path: '/reports/stock-movement',
      reports: [
        'Inventory Turnover',
        'Days on Hand',
        'Movement Patterns',
      ],
    },
    {
      title: 'Aging Stock',
      description: 'Stock aging, obsolescence risk, and aging recommendations',
      icon: Schedule,
      color: '#d32f2f',
      path: '/reports/aging-stock',
      reports: [
        'Stock Aging',
        'Obsolescence Risk',
        'Aging Recommendations',
      ],
    },
    {
      title: 'Performance Metrics',
      description: 'Accuracy, variance, adjustment trends, and transfer efficiency',
      icon: Analytics,
      color: '#9c27b0',
      path: '/reports/performance-metrics',
      reports: [
        'Inventory Accuracy',
        'Variance Report',
        'Adjustment Trends',
        'Transfer Efficiency',
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
          Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Access comprehensive reports for sales analytics and inventory management
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reportCategories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Grid item xs={12} sm={6} md={4} key={category.title}>
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
                  onClick={() => navigate(category.path)}
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
                        bgcolor: `${category.color}15`,
                        color: category.color,
                        borderRadius: 2,
                        p: 1.5,
                        mr: 2,
                      }}
                    >
                      <IconComponent sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {category.title}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, flexGrow: 1 }}
                  >
                    {category.description}
                  </Typography>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Available Reports:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {category.reports.map((report, index) => (
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
                          {report}
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

export default Reports;
