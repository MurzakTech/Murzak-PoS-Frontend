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
  Autorenew,
  CalendarToday,
  ShowChart,
} from '@mui/icons-material';

const StockMovement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/reports/stock-movement';

  const reports = [
    {
      title: 'Inventory Turnover',
      description: 'Calculate turnover rates for inventory items to identify fast and slow-moving stock',
      icon: Autorenew,
      color: '#1976d2',
      path: '/reports/stock-movement/turnover',
      features: [
        'Turnover rate calculation',
        'Average stock levels',
        'Cost of sales analysis',
        'Turnover days metric',
      ],
    },
    {
      title: 'Days on Hand',
      description: 'Calculate days of stock remaining based on current stock and average consumption',
      icon: CalendarToday,
      color: '#2e7d32',
      path: '/reports/stock-movement/days-on-hand',
      features: [
        'Current stock levels',
        'Average daily sales',
        'Days remaining calculation',
        'Status indicators (normal/low/critical)',
      ],
    },
    {
      title: 'Movement Patterns',
      description: 'Analyze movement trends and patterns over time including seasonal and forecast analysis',
      icon: ShowChart,
      color: '#ed6c02',
      path: '/reports/stock-movement/movement-patterns',
      features: [
        'Trend analysis',
        'Time series data',
        'Seasonal patterns',
        'Movement forecasting',
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
          Stock Movement Analysis Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analyze inventory turnover, days on hand, and movement patterns to optimize stock levels
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

export default StockMovement;

