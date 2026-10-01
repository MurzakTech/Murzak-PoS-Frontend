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
} from '@mui/material';
import {
  CheckCircle,
  CompareArrows,
  TrendingUp,
  LocalShipping,
} from '@mui/icons-material';

const PerformanceMetrics = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/reports/performance-metrics';

  const reports = [
    {
      title: 'Inventory Accuracy',
      description: 'Get stock accuracy metrics comparing book vs actual inventory counts',
      icon: CheckCircle,
      color: '#2e7d32',
      path: '/reports/performance-metrics/accuracy',
      features: [
        'Accuracy rate calculation',
        'Variance count tracking',
        'Items counted vs variance',
        'Total variance value',
      ],
    },
    {
      title: 'Inventory Variance',
      description: 'Get detailed variance analysis from stock counts with threshold filtering',
      icon: CompareArrows,
      color: '#1976d2',
      path: '/reports/performance-metrics/variance',
      features: [
        'Book vs counted quantities',
        'Variance quantity and value',
        'Variance percentage',
        'Reconciliation tracking',
      ],
    },
    {
      title: 'Adjustment Trends',
      description: 'Track trends in stock adjustments over time with increase/decrease analysis',
      icon: TrendingUp,
      color: '#ed6c02',
      path: '/reports/performance-metrics/adjustment-trends',
      features: [
        'Adjustment count trends',
        'Quantity and value tracking',
        'Increase/decrease breakdown',
        'Period-based analysis',
      ],
    },
    {
      title: 'Transfer Efficiency',
      description: 'Get metrics on stock transfer performance including completion rates and accuracy',
      icon: LocalShipping,
      color: '#9c27b0',
      path: '/reports/performance-metrics/transfer-efficiency',
      features: [
        'Completion rate tracking',
        'Average completion time',
        'Transfer accuracy metrics',
        'On-time rate analysis',
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
          Performance Metrics Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor inventory accuracy, variance, adjustment trends, and transfer efficiency
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reports.map((report) => {
          const IconComponent = report.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={report.title}>
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

export default PerformanceMetrics;

