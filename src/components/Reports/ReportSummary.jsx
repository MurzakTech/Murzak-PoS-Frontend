import React from 'react';
import { GridLegacy as Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * ReportSummary Component
 * Displays summary cards with key metrics
 * 
 * @param {Object} props
 * @param {Object} props.data - Summary data object
 * @param {number} props.data.total_revenue - Total revenue
 * @param {number} props.data.total_quantity - Total quantity sold
 * @param {number} props.data.total_invoices - Total number of invoices
 * @param {number} props.data.average_order_value - Average order value
 */
const ReportSummary = ({ data }) => {
  const theme = useTheme();

  if (!data) return null;

  const summaryItems = [
    {
      title: 'Total Revenue',
      value: data.total_revenue || 0,
      format: 'currency',
      color: '#2196f3',
      icon: '💰',
    },
    {
      title: 'Total Quantity',
      value: data.total_quantity || 0,
      format: 'number',
      color: '#4caf50',
      icon: '📦',
    },
    {
      title: 'Total Invoices',
      value: data.total_invoices || 0,
      format: 'number',
      color: '#ff9800',
      icon: '📄',
    },
    {
      title: 'Average Order Value',
      value: data.average_order_value || 0,
      format: 'currency',
      color: '#9c27b0',
      icon: '📊',
    },
  ];

  const formatValue = (value, format) => {
    if (format === 'currency') {
      return `KES ${value?.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }
    return value?.toLocaleString();
  };

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {summaryItems.map((item) => (
        <Grid item xs={12} sm={6} md={3} key={item.title}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(item.color, 0.1)} 0%, ${alpha(item.color, 0.05)} 100%)`,
              border: `1px solid ${alpha(item.color, 0.2)}`,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              },
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box flex={1}>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="overline"
                    fontWeight="medium"
                    fontSize="0.7rem"
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="h5"
                    component="div"
                    fontWeight="bold"
                    sx={{ color: item.color }}
                    gutterBottom
                  >
                    {formatValue(item.value, item.format)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    padding: 1.5,
                    borderRadius: 1.5,
                    backgroundColor: `${alpha(item.color, 0.15)}`,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                  }}
                >
                  {item.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ReportSummary;

