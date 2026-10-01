import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  Schedule,
  Warning,
  Lightbulb,
} from '@mui/icons-material';

const AgingStock = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on a child route
  const isChildRoute = location.pathname !== '/reports/aging-stock';

  const reports = [
    {
      title: 'Stock Aging',
      description: 'View stock aging report with movement rate and slow-moving threshold analysis',
      icon: Schedule,
      color: '#ed6c02',
      path: '/reports/aging-stock/stock-aging',
      features: [
        'Age brackets (0-30, 31-60, 61-90, 90+ days)',
        'Movement rate tracking',
        'Slow-moving identification',
        'Warehouse breakdown',
      ],
    },
    {
      title: 'Obsolescence Risk',
      description: 'Identify items with high obsolescence risk based on age and movement patterns',
      icon: Warning,
      color: '#d32f2f',
      path: '/reports/aging-stock/obsolescence-risk',
      features: [
        'Risk score calculation',
        'Risk level classification',
        'Risk factors identification',
        'Age and movement analysis',
      ],
    },
    {
      title: 'Aging Recommendations',
      description: 'Get recommended actions for aging stock items to optimize inventory',
      icon: Lightbulb,
      color: '#9c27b0',
      path: '/reports/aging-stock/aging-recommendations',
      features: [
        'Action recommendations',
        'Priority levels',
        'Reason explanations',
        'Age bracket analysis',
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
          Aging Stock Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analyze stock aging, identify obsolescence risks, and get recommendations for aging inventory
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

export default AgingStock;

