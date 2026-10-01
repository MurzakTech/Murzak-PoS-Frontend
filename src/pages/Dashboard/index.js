import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
  TextField,
  alpha,
  IconButton,
  InputAdornment,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp,
  TrendingDown,
  Receipt,
  Inventory,
  LocalShipping,
  AccountBalance,
  AssignmentReturn,
  Refresh as RefreshIcon,
  BusinessCenter,
  Restaurant,
  ShoppingCart,
  LocalHospital,
  School,
  Build,
  Store,
  Spa,
  FitnessCenter,
  DirectionsCar,
  Computer,
  Home,
  CheckCircle,
  Lock as LockIcon,
  LocalBar,
  FilterList,
  CalendarToday,
  Download,
  ViewDay,
  ViewWeek,
  CalendarViewMonth,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { listWarehouses } from '../../store/warehouseSlice';
import { getStaffUsers } from '../../store/staffSlice';
import { getProducts } from '../../store/productSlice';
import { getPOSIndustries } from '../../store/authSlice';
import { bulkUploadProducts } from '../../store/productSeedingSlice';
import blue from '../../assets/blue.png';
import green from '../../assets/green.png';
import orange from '../../assets/orange.png';
import purple from '../../assets/purple.png';



// Industry icon mapping function
const getIndustryDetails = (industryCode, industryName) => {
  const code = (industryCode || industryName || '').toLowerCase();
  const name = (industryName || industryCode || '').toLowerCase();

  if (code.includes('restaurant') || name.includes('restaurant') || code.includes('food') || code.includes('cafe')) {
    return {
      icon: <Restaurant />,
      color: '#9b59b6',
      bgColor: '#e8d5f0',
      description: 'Tables, Menus, Kitchen, Display, etc'
    };
  } else if (code.includes('bar') || name.includes('bar')) {
    return {
      icon: <LocalBar />,
      color: '#e67e22',
      bgColor: '#fdebd0',
      description: 'Floor plan, Tips, Self Order, etc'
    };
  } else if (code.includes('retail') || name.includes('retail') || code.includes('shop') || code.includes('store')) {
    return {
      icon: <Store />,
      color: '#27ae60',
      bgColor: '#d5f4e6',
      description: 'Any shop'
    };
  } else if (code.includes('clothes') || name.includes('clothes') || code.includes('clothing') || code.includes('fashion') || code.includes('apparel')) {
    return {
      icon: <ShoppingCart />,
      color: '#e74c3c',
      bgColor: '#fadbd8',
      description: 'Multi colors and sizes'
    };
  } else if (code.includes('furniture') || name.includes('furniture')) {
    return {
      icon: <Home />,
      color: '#8e44ad',
      bgColor: '#ebdef0',
      description: 'Stock, Product Configurator, Replenishment, Discounts'
    };
  } else if (code.includes('pharmacy') || name.includes('pharmacy') || code.includes('medical') || code.includes('hospital')) {
    return {
      icon: <LocalHospital />,
      color: '#16a085',
      bgColor: '#d1f2eb',
      description: 'Medicines of various kinds'
    };
  } else if (code.includes('hardware') || name.includes('hardware') || code.includes('construction') || code.includes('building')) {
    return {
      icon: <Build />,
      color: '#d35400',
      bgColor: '#fdebd0',
      description: 'Tools, Fittings, etc'
    };
  } else if (code.includes('education') || name.includes('education') || code.includes('school') || code.includes('university')) {
    return {
      icon: <School />,
      color: '#95e1d3',
      bgColor: '#e0f7f3',
      description: 'Educational supplies and services'
    };
  } else if (code.includes('beauty') || name.includes('beauty') || code.includes('salon') || code.includes('spa')) {
    return {
      icon: <Spa />,
      color: '#c44569',
      bgColor: '#f8e0ea',
      description: 'Beauty products and services'
    };
  } else if (code.includes('fitness') || name.includes('fitness') || code.includes('gym') || code.includes('sport')) {
    return {
      icon: <FitnessCenter />,
      color: '#ee5a6f',
      bgColor: '#ffe0e5',
      description: 'Fitness equipment and services'
    };
  } else if (code.includes('automotive') || name.includes('automotive') || code.includes('car') || code.includes('vehicle')) {
    return {
      icon: <DirectionsCar />,
      color: '#3742fa',
      bgColor: '#e0e2ff',
      description: 'Automotive parts and services'
    };
  } else if (code.includes('electronics') || name.includes('electronics') || code.includes('computer') || code.includes('tech')) {
    return {
      icon: <Computer />,
      color: '#2f3542',
      bgColor: '#e8e9eb',
      description: 'Electronics and technology'
    };
  }
  return {
    icon: <BusinessCenter />,
    color: '#747d8c',
    bgColor: '#e8e9eb',
    description: 'General business'
  };
};

// Modern StatCard Component with compact option
const StatCard = ({ title, value, subtitle, icon, color, trend, trendValue, vector, loading = false, compact = false }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
      
        '&::after': vector
          ? {
              content: '""',
              position: 'absolute',
              bottom: -12,
              right: -12,
              width: compact ? 120 : 160,
              height: compact ? 120 : 160,
              backgroundImage: `url(${vector})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'contain',
              opacity: 0.25,
              pointerEvents: 'none',
            }
          : {},
        height: '100%',
        minHeight: compact ? 120 : 160, // Reduced height for compact
        borderRadius: compact ? 2 : 3, // Smaller border radius
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)', // Reduced shadow
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: theme.palette.mode === 'dark'
          ? theme.palette.background.paper
          : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', // Faster transition
        '&:hover': {
          transform: compact ? 'translateY(-2px)' : 'translateY(-4px)', // Smaller hover lift
          boxShadow: compact ? '0 8px 24px rgba(0,0,0,0.06)' : '0 16px 48px rgba(0,0,0,0.08)',
          borderColor: alpha(color, 0.3),
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: compact ? 3 : 4, // Thinner gradient bar
          background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
          borderRadius: compact ? '2px 2px 0 0' : '3px 3px 0 0',
        },
      }}
    >
      <CardContent   sx={{
    position: 'relative',
    zIndex: 1,
    p: compact ? 2 : 3,
  }}> {/* Reduced padding */}
        <Box display="flex" flexDirection="column" height="100%">
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={compact ? 1 : 2}>
            <Box>
              <Typography
                variant="overline"
                fontWeight="600"
                color="text.secondary"
                sx={{
                  fontSize: compact ? '0.65rem' : '0.7rem', // Smaller font
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
              {loading ? (
                <Box sx={{ height: compact ? 32 : 40, display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={compact ? 16 : 20} /> {/* Smaller loader */}
                </Box>
              ) : (
                <Typography
                  variant={compact ? "h5" : "h4"} // Smaller heading
                  fontWeight="700"
                  color="text.primary"
                  sx={{
                    mt: 0.25,
                    fontSize: compact ? '1.25rem' : undefined,
                    background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.8)} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  KES {value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                p: compact ? 1 : 1.5, // Smaller padding
                borderRadius: compact ? 1.5 : 2, // Smaller radius
                background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {React.cloneElement(icon, { sx: { fontSize: compact ? '1.25rem' : '1.5rem' } })}
            </Box>
          </Box>

          {/* Subtitle and Trend */}
          <Box sx={{ mt: 'auto' }}>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: compact ? '0.8rem' : '0.85rem', // Smaller subtitle
                  mb: compact ? 0.5 : 1,
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </Typography>
            )}
            
            {trend && trendValue && (
              <Box display="flex" alignItems="center" gap={0.5}>
                {trend === 'up' ? (
                  <ArrowUpward sx={{ fontSize: compact ? 14 : 16, color: theme.palette.success.main }} />
                ) : (
                  <ArrowDownward sx={{ fontSize: compact ? 14 : 16, color: theme.palette.error.main }} />
                )}
                <Typography
                  variant="caption"
                  fontWeight="600"
                  color={trend === 'up' ? 'success.main' : 'error.main'}
                  sx={{
                    fontSize: compact ? '0.7rem' : '0.8rem', // Smaller trend text
                  }}
                >
                  {trendValue}% {trend === 'up' ? 'inc' : 'dec'} {/* Abbreviated */}
                </Typography>
                {!compact && ( // Hide "from last period" text in compact mode
                  <Typography variant="caption" color="text.secondary">
                    from last period
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Modern IndustryCard Component
const IndustryCard = ({ industry, isEnabled, userIndustry, onIndustryClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isUserIndustry = isEnabled;
  
  const { icon, color, bgColor, description } = getIndustryDetails(
    industry.industry_code, 
    industry.industry_name || industry.name
  );

  const handleClick = async () => {
    if (isEnabled && onIndustryClick) {
      await onIndustryClick(industry.industry_code || industry.name);
    }
  };

  return (
    <Card
      onClick={handleClick}
      sx={{
        height: '100%',
        minHeight: 320,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: isEnabled 
          ? `linear-gradient(135deg, ${alpha(bgColor, 0.1)} 0%, ${theme.palette.background.paper} 100%)`
          : alpha(theme.palette.grey[theme.palette.mode === 'dark' ? 800 : 100], 0.8),
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        cursor: isEnabled ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        opacity: isEnabled ? 1 : 0.6,
        '&:hover': isEnabled ? {
          transform: 'translateY(-6px)',
          boxShadow: `0 20px 60px ${alpha(color, 0.15)}`,
          '& .industry-icon': {
            transform: 'scale(1.1)',
          },
        } : {},
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, 0.05)} 0%, transparent 70%)`,
          zIndex: 0,
        }}
      />

      <CardContent sx={{ 
        p: 3.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Icon Section */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          mb: 3,
        }}>
          <Box
            className="industry-icon"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
              border: `1px solid ${alpha(color, 0.2)}`,
              color: color,
              transition: 'transform 0.3s ease',
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: '2.5rem' } })}
          </Box>
        </Box>

        {/* Content Section */}
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography
            variant="h6"
            fontWeight="700"
            gutterBottom
            sx={{
              fontSize: '1.1rem',
              color: isEnabled ? 'text.primary' : 'text.disabled',
              mb: 2,
            }}
          >
            {industry.industry_name || industry.name}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: isEnabled ? 'text.secondary' : 'text.disabled',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              mb: 3,
              minHeight: 48,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        </Box>

        {/* Action Section */}
        <Box sx={{ mt: 'auto' }}>
          {isUserIndustry && isEnabled ? (
            <Chip
              icon={<CheckCircle />}
              label="Current Industry"
              sx={{
                width: '100%',
                background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
                color: 'white',
                fontWeight: 600,
                borderRadius: 2,
                py: 1,
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          ) : isEnabled ? (
            <Button
              fullWidth
              variant="contained"
              sx={{
                background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                color: color,
                border: `1px solid ${alpha(color, 0.2)}`,
                fontWeight: 600,
                borderRadius: 2,
                py: 1.5,
                '&:hover': {
                  background: `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.1)} 100%)`,
                  borderColor: alpha(color, 0.3),
                },
              }}
            >
              Select Industry
            </Button>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                color: 'text.disabled',
                py: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.grey[200], 0.5),
              }}
            >
              <LockIcon fontSize="small" />
              <Typography variant="body2" fontStyle="italic">
                Coming Soon
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Modern Filter Section
const FilterSection = ({ filters, handleFilterChange, warehouses, staffUsers, loading, onRefresh, onExport }) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('day');

  return (
    <Paper
      sx={{
        p: 3,
        mb: 4,
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: theme.palette.mode === 'dark'
          ? theme.palette.background.paper
          : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="600">
          Dashboard Analytics
        </Typography>
        <Stack direction="row" spacing={1}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="day">
              <ViewDay fontSize="small" />
            </ToggleButton>
            <ToggleButton value="week">
              <ViewWeek fontSize="small" />
            </ToggleButton>
            <ToggleButton value="month">
              <CalendarViewMonth fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
          <IconButton size="small" onClick={onExport} disabled={!onExport}>
            <Download fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Time Period</InputLabel>
            <Select
              value={filters.period}
              label="Time Period"
              onChange={(e) => handleFilterChange('period', e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <CalendarToday fontSize="small" />
                </InputAdornment>
              }
            >
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {filters.period === 'custom' && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                size="small"
                value={filters.from_date || ''}
                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                size="small"
                value={filters.to_date || ''}
                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </>
        )}

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Warehouse</InputLabel>
            <Select
              value={filters.warehouse}
              label="Warehouse"
              onChange={(e) => handleFilterChange('warehouse', e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <Inventory fontSize="small" />
                </InputAdornment>
              }
            >
              <MenuItem value="">All Warehouses</MenuItem>
              {warehouses.map((wh) => (
                <MenuItem key={wh.name} value={wh.name}>
                  {wh.warehouse_name || wh.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Staff Member</InputLabel>
            <Select
              value={filters.staff}
              label="Staff Member"
              onChange={(e) => handleFilterChange('staff', e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <FilterList fontSize="small" />
                </InputAdornment>
              }
            >
              <MenuItem value="">All Staff</MenuItem>
              {staffUsers.map((staff) => (
                <MenuItem key={staff.name || staff.email} value={staff.name || staff.email}>
                  {staff.full_name || staff.name || staff.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={loading}
            sx={{
              height: 40,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
              },
            }}
          >
            Refresh Data
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

// Enhanced Chart Components
const SalesPerformanceChart = ({ data }) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="600">
          Sales Performance
        </Typography>
        <Chip label="Last 30 Days" size="small" />
      </Box>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => new Date(value).getDate()}
            stroke={theme.palette.text.secondary}
            fontSize={12}
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            formatter={(value) => [`KES ${value?.toLocaleString()}`, 'Sales']}
            labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: theme.palette.background.paper,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="#2196f3"
            strokeWidth={3}
            fill="url(#colorSales)"
            activeDot={{ r: 6, fill: '#2196f3' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Paper>
  );
};

const MonthlySalesChart = ({ data }) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="600">
          Monthly Overview
        </Typography>
        <Chip label="Current Year" size="small" />
      </Box>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
          <XAxis
            dataKey="month"
            stroke={theme.palette.text.secondary}
            fontSize={12}
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            fontSize={12}
            tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            formatter={(value, name) => {
              const label = name === 'sales' ? 'Sales' : name === 'net' ? 'Net Sales' : 'Returns';
              return [`KES ${value?.toLocaleString()}`, label];
            }}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: theme.palette.background.paper,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          />
          <Bar
            dataKey="sales"
            fill="url(#colorBarSales)"
            radius={[8, 8, 0, 0]}
          />
          <defs>
            <linearGradient id="colorBarSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4caf50" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#4caf50" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const navigate = useNavigate();
  
  const { user, industries, isLoadingIndustries, isLoading: isLoadingAuth } = useAppSelector((state) => state.auth);
  const { warehouses, activeWarehouse } = useAppSelector((state) => state.warehouse);
  const { staffUsers } = useAppSelector((state) => state.staff);
  const { products, pagination, isLoading: isLoadingProducts } = useAppSelector((state) => state.product);
  
  const [filters, setFilters] = useState({
    period: '30days',
    warehouse: '',
    staff: '',
    from_date: null,
    to_date: null,
  });
  
  const [hasCheckedProducts, setHasCheckedProducts] = useState(false);
  const userIndustry = user?.pos_industry || null;
  const userIndustryCode = user?.pos_industry?.industry_code || user?.pos_industry?.name || null;

  // Initialize active warehouse filter
  useEffect(() => {
    if (activeWarehouse && !filters.warehouse) {
      setFilters(prev => ({ ...prev, warehouse: activeWarehouse.name || activeWarehouse.warehouse_name || '' }));
    }
  }, [activeWarehouse]);

  // Check if user has products
  useEffect(() => {
    const checkProducts = async () => {
      if (isLoadingAuth) return;
      
      if (user?.company && !hasCheckedProducts) {
        try {
          await dispatch(getProducts({
            company: user.company,
            page: 1,
            page_size: 1
          })).unwrap();
          setHasCheckedProducts(true);
        } catch (error) {
          setHasCheckedProducts(true);
        }
      } else if (!user && !isLoadingAuth) {
        setHasCheckedProducts(true);
      }
    };
    checkProducts();
  }, [dispatch, user, hasCheckedProducts, isLoadingAuth]);

  // Fetch dashboard metrics
  const { data: dashboardData, loading: metricsLoading, error, refetch } = useDashboardMetrics(filters);

  // Fetch warehouses and staff
  useEffect(() => {
    if (user?.company) {
      dispatch(listWarehouses({ company: user.company, limit: 1000 }));
      dispatch(getStaffUsers({ company: user.company, enabledOnly: false }));
    }
  }, [dispatch, user?.company]);

  // Fetch industries if no products
  useEffect(() => {
    if (hasCheckedProducts && pagination.total === 0) {
      if (industries.length === 0 && !isLoadingIndustries) {
        dispatch(getPOSIndustries({ is_active: true }));
      }
    }
  }, [hasCheckedProducts, pagination.total, industries.length, isLoadingIndustries, dispatch]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      if (key === 'period' && value !== 'custom') {
        newFilters.from_date = null;
        newFilters.to_date = null;
      }
      return newFilters;
    });
  };

  const handleIndustryClick = async (industryCode) => {
    try {
      await dispatch(bulkUploadProducts()).unwrap();
      navigate(`/industry/${encodeURIComponent(industryCode)}/products`);
    } catch (error) {
      console.error('Bulk upload failed:', error);
      navigate(`/industry/${encodeURIComponent(industryCode)}/products`);
    }
  };

  const hasNoProducts = hasCheckedProducts && pagination.total === 0;

  // Loading state
  if (isLoadingAuth || !hasCheckedProducts || isLoadingProducts) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      }}>
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} sx={{ mb: 3, color: 'primary.main' }} />
          <Typography variant="body1" color="text.secondary">
            Loading dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Industry Selection View
  if (hasNoProducts) {
    return (
      <Box sx={{
        p: { xs: 2, sm: 3, md: 4 },
        minHeight: '100vh',
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      }}>
        <Box sx={{ 
          maxWidth: 1400, 
          mx: 'auto',
        }}>
          {/* Hero Section */}
          <Paper sx={{
            p: { xs: 3, sm: 4, md: 5 },
            mb: 4,
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: theme.palette.mode === 'dark'
              ? theme.palette.background.paper
              : 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
            textAlign: 'center',
          }}>
            <Typography variant="h4" fontWeight="700" gutterBottom sx={{ mb: 2 }}>
              Welcome to Your Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
              Get started by selecting your industry below. We'll automatically set up relevant product templates for your business.
            </Typography>
            
            {userIndustry && (
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
                borderRadius: 2,
                background: alpha(theme.palette.success.main, 0.08),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                mb: 4,
              }}>
                <CheckCircle sx={{ color: 'success.main' }} />
                <Box textAlign="left">
                  <Typography variant="subtitle2" fontWeight="600" color="success.main">
                    Your registered industry is ready for setup
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click on your industry card below to begin
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Industry Grid */}
          {isLoadingIndustries ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
                Select Your Industry
              </Typography>
              <Grid container spacing={3}>
                {industries.map((industry) => {
                  const isUserIndustry = userIndustryCode && (
                    industry.industry_code === userIndustryCode ||
                    industry.name === userIndustryCode
                  );
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={industry.industry_code || industry.name}>
                      <IndustryCard
                        industry={industry}
                        isEnabled={isUserIndustry}
                        userIndustry={userIndustry}
                        onIndustryClick={handleIndustryClick}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}
        </Box>
      </Box>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          }}
        >
          {error}
        </Alert>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />} 
          onClick={refetch}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          }}
        >
          Retry Loading Data
        </Button>
      </Box>
    );
  }

  const data = dashboardData || {
    stats: {
      totalSales: 0,
      netSales: 0,
      salesReturns: 0,
      totalPurchases: 0,
      netPurchases: 0,
      purchaseReturns: 0,
      invoicesDue: 0,
      totalExpense: 0,
      profitMargin: 0,
      averageTransaction: 0,
      salesReturnsCount: 0,
      purchaseReturnsCount: 0,
      invoicesDueCount: 0,
    },
    salesLast30Days: [],
    monthlySales: [],
    salesDue: [],
    purchasesDue: [],
    stockAlerts: [],
    pendingShipments: [],
  };

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', data.stats.totalSales],
      ['Net Sales', data.stats.netSales],
      ['Total Purchases', data.stats.totalPurchases],
      ['Net Purchases', data.stats.netPurchases],
      ['Outstanding Invoices', data.stats.invoicesDue],
      ['Sales Returns', data.stats.salesReturns],
      ['Purchase Returns', data.stats.purchaseReturns],
      ['Operating Expenses', data.stats.totalExpense],
      ['Profit Margin (%)', data.stats.profitMargin],
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dashboard-summary-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 },
      background: theme.palette.mode === 'dark'
        ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`
        : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      minHeight: '100vh',
    }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="700" gutterBottom>
            Dashboard Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time insights and analytics for your business
          </Typography>
        </Box>

        {/* Filters */}
        <FilterSection
          filters={filters}
          handleFilterChange={handleFilterChange}
          warehouses={warehouses}
          staffUsers={staffUsers}
          loading={metricsLoading}
          onRefresh={refetch}
          onExport={handleExportCSV}
        />

        {/* Stats Cards */}
{/* Stats Cards */}
<Grid container spacing={2} sx={{ mb: 3 }}>
  {[
    {
      title: 'Total Revenue',
      value: data.stats.totalSales,
      subtitle: `Net: KES ${data.stats.netSales?.toLocaleString()}`,
      icon: <TrendingUp />,
      color: '#2196f3',
      trend: 'up',
      vector: blue,
      trendValue: 12.5,
    },
    {
      title: 'Total Purchases',
      value: data.stats.totalPurchases,
      subtitle: `Net: KES ${data.stats.netPurchases?.toLocaleString()}`,
      icon: <Inventory />,
      color: '#4caf50',
      trend: 'down',
      vector: green,
      trendValue: 3.2,
    },
    {
      title: 'Outstanding Invoices',
      value: data.stats.invoicesDue,
      subtitle: `${data.stats.invoicesDueCount || data.salesDue.length} pending`,
      icon: <Receipt />,
      color: '#9c27b0',
      vector: orange,
    },
    {
      title: 'Net Profit',
      value: data.stats.netSales - data.stats.totalExpense,
      subtitle: `${data.stats.profitMargin}% margin`,
      icon: <AccountBalance />,
      color: '#00bcd4',
      trend: 'up',
      vector: purple,
      trendValue: 8.7,
    },
    {
      title: 'Sales Returns',
      value: data.stats.salesReturns,
      subtitle: `${data.stats.salesReturnsCount} returns`,
      icon: <AssignmentReturn />,
      color: '#ff9800',
      vector: blue,
    },
    {
      title: 'Purchase Returns',
      value: data.stats.purchaseReturns,
      subtitle: `${data.stats.purchaseReturnsCount} returns`,
      icon: <TrendingDown />,
      color: '#f44336',
      vector: green,
    },
    {
      title: 'Operating Expenses',
      value: data.stats.totalExpense,
      subtitle: 'Monthly overhead',
      icon: <AccountBalance />,
      color: '#607d8b',
      vector: orange,
    },
    {
      title: 'Pending Shipments',
      value: data.pendingShipments.reduce((acc, s) => acc + (s.items || 0), 0),
      subtitle: `${data.pendingShipments.length} orders`,
      icon: <LocalShipping />,
      color: '#ff5722',
      vector: purple,
    },
  ].map((stat, index) => (
    <Grid item xs={12} sm={6} md={3} key={index}>
      <StatCard 
        {...stat} 
        loading={metricsLoading}
        compact 
      />
    </Grid>
  ))}
</Grid>

        {/* Charts */}
        {/* <Grid container spacing={3} sx={{ mb: 4 }}> */}
          <Grid item xs={12} lg={8}>
            <SalesPerformanceChart data={data.salesLast30Days} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <MonthlySalesChart data={data.monthlySales} />
          </Grid>
        {/* </Grid> */}

        {/* Data Tables */}
        {/* <Grid container spacing={3}> */}
          {/* Outstanding Payments */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3, 
              height: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="600">
                  Outstanding Payments
                </Typography>
                <Chip 
                  label={`KES ${data.salesDue.reduce((acc, d) => acc + (d.amount || 0), 0).toLocaleString()}`}
                  size="small"
                  color="primary"
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.salesDue.slice(0, 5).map((row) => (
                      <TableRow key={row.id || Math.random()} hover>
                        <TableCell>{row.customer || 'N/A'}</TableCell>
                        <TableCell align="right">
                          KES {(row.amount || 0)?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.status || 'Pending'}
                            size="small"
                            color={row.status === 'Overdue' ? 'error' : row.status === 'Due Soon' ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Stock Alerts */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3, 
              height: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="600">
                  Stock Alerts
                </Typography>
                <Chip 
                  label={`${data.stockAlerts.length} alerts`}
                  size="small"
                  color="warning"
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Current</TableCell>
                      <TableCell align="right">Min</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.stockAlerts.slice(0, 5).map((row) => (
                      <TableRow key={row.id || Math.random()} hover>
                        <TableCell>{row.product || 'N/A'}</TableCell>
                        <TableCell align="right">{row.currentStock || 0}</TableCell>
                        <TableCell align="right">{row.minStock || 0}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.status || 'Normal'}
                            size="small"
                            color={
                              row.status === 'Critical' ? 'error' : 
                              row.status === 'Low' ? 'warning' : 
                              'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        {/* </Grid> */}
      </Box>
    </Box>
  );
};

export default Dashboard;
