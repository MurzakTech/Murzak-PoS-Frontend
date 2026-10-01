import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Avatar,
  alpha,
  Tooltip,
  Button,
  FormControl,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  Brightness4,
  Brightness7,
  PointOfSale,
  Inventory2,
  Home,
  NavigateNext,
} from '@mui/icons-material';
import { useThemeMode } from '../../theme/ThemeProvider';
import { getNavigationRoutes } from '../../routes/routes';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { listWarehouses, getDefaultWarehouse, setActiveWarehouse } from '../../store/warehouseSlice';
import UserMenu from './UserMenu';
import SystemStatus from './SystemStatus';
import NavigationMenu from './NavigationMenu';
import PageSidebar from './PageSidebar';
import logoIcon from '../../assets/logo_icon.png';

const drawerWidth = 200;
const collapsedDrawerWidth = 52;

const Layout = ({ children }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleColorMode } = useThemeMode();
  const { user } = useAppSelector((state) => state.auth);
  const { warehouses, activeWarehouse, defaultWarehouse, isLoading } = useAppSelector((state) => state.warehouse);

  const navigationRoutes = getNavigationRoutes();

  // Always collapsed by default, expands on hover
  const isExpanded = isMobile || isHovered;
  const currentDrawerWidth = isMobile ? drawerWidth : (isExpanded ? drawerWidth : collapsedDrawerWidth);
  
  // Check if we're on POS route - render full screen without drawer
  const isPOSRoute = location.pathname === '/sales';

  const userCompany = user?.company || user?.custom_company || user?.company_name ||
    user?.company_data?.name || user?.company_data?.company_name;

  // Fetch warehouses and default warehouse on mount
  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getDefaultWarehouse({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  // Initialize activeWarehouse if not set
  useEffect(() => {
    if (warehouses.length > 0 && !activeWarehouse) {
      // Use default warehouse if available, otherwise first warehouse
      const warehouseToSet = defaultWarehouse || warehouses.find(w => w.is_default) || warehouses[0];
      if (warehouseToSet) {
        dispatch(setActiveWarehouse(warehouseToSet));
      }
    }
  }, [warehouses, defaultWarehouse, activeWarehouse, dispatch]);

  // Handle warehouse selection change
  const handleWarehouseChange = (event) => {
    const selectedWarehouseName = event.target.value;
    const selectedWarehouse = warehouses.find(
      (w) => w.name === selectedWarehouseName || w.warehouse_name === selectedWarehouseName
    );
    if (selectedWarehouse) {
      dispatch(setActiveWarehouse(selectedWarehouse));
    }
  };

  const handleDrawerToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    }
  }, [isMobile]);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setIsHovered(true);
    }
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsHovered(false);
    }
  }, [isMobile]);

  const handleNavigation = useCallback((path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [navigate, isMobile]);

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleSync = async () => {
    // TODO: Implement sync functionality
    console.log('Syncing data...');
  };

  // Memoize drawer content
  const drawer = useMemo(() => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo/Header Section */}
      <Toolbar
        sx={{
          minHeight: 44,
          px: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          borderBottom: 1,
          borderColor: alpha(theme.palette.divider, 0.5),
        }}
      >
            <Box
              component="img"
              src={logoIcon}
              alt="Murzak POS"
          sx={{
            height: isExpanded ? 24 : 22,
            width: isExpanded ? 24 : 22,
            transition: 'all 0.2s ease',
          }}
        />
        {isExpanded && (
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              ml: 1,
              color: 'text.primary',
              opacity: isExpanded ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            Murzak POS
          </Typography>
        )}
      </Toolbar>
      
      {/* Navigation Menu */}
      <NavigationMenu 
        desktopOpen={isExpanded}
        onNavigate={handleNavigation}
      />
    </Box>
  ), [isExpanded, isMobile, handleNavigation, theme.palette.divider]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar - Top Navigation - Hide for POS route */}
      {!isPOSRoute && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${collapsedDrawerWidth}px)` },
            ml: { md: `${collapsedDrawerWidth}px` },
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
        <Toolbar sx={{ minHeight: 44, px: { xs: 1, sm: 1.5 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            size="small"
            sx={{ 
              mr: 1.5,
              display: { md: 'none' },
              color: 'text.primary',
            }}
          >
            <MenuIcon sx={{ fontSize: '1.125rem' }} />
          </IconButton>

          {/* Breadcrumbs Navigation */}
          <Breadcrumbs
            separator={<NavigateNext sx={{ fontSize: '1rem', color: 'text.disabled' }} />}
            sx={{ 
              flexGrow: 1,
              minWidth: 0,
              overflow: 'hidden',
              '& .MuiBreadcrumbs-ol': {
                flexWrap: 'nowrap',
                alignItems: 'center',
                overflow: 'hidden',
              },
              '& .MuiBreadcrumbs-li': {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
              '& .MuiBreadcrumbs-separator': {
                mx: 0.75,
              },
            }}
          >
            <Link
              component={RouterLink}
              to="/dashboard"
              underline="hover"
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                fontSize: '0.8125rem',
                fontWeight: 500,
                '&:hover': { color: 'primary.main' },
            }}
          >
              <Home sx={{ fontSize: '1rem', mr: { xs: 0, sm: 0.5 } }} />
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Home</Box>
            </Link>

            {(() => {
              const currentRoute = navigationRoutes.find((r) => {
                if (location.pathname === r.path) return true;
                if (r.pageChildren) {
                  return r.pageChildren.some(
                    (child) => location.pathname === child.path || location.pathname.startsWith(child.path + '/')
                  );
                }
                return location.pathname.startsWith(r.path + '/');
              });

              const childRoute = navigationRoutes.find(
                (r) => r.hideFromMenu && r.parentPath && location.pathname.startsWith(r.path.split(':')[0])
              );

              const isOnChildPage = childRoute || (currentRoute?.pageChildren?.some(
                (c) => c.path !== currentRoute.path && (location.pathname === c.path || location.pathname.startsWith(c.path + '/'))
              ));

              let currentChildLabel = null;
              if (currentRoute?.pageChildren) {
                const matchedChild = currentRoute.pageChildren.find(
                  (c) => c.path !== currentRoute.path && (location.pathname === c.path || location.pathname.startsWith(c.path + '/'))
                );
                if (matchedChild) currentChildLabel = matchedChild.label;
              }
              if (!currentChildLabel && childRoute) {
                currentChildLabel = childRoute.label;
              }

              const breadcrumbItems = [];
              
              if (currentRoute) {
                if (isOnChildPage) {
                  breadcrumbItems.push(
                    <Link
                      key="parent"
                      component={RouterLink}
                      to={currentRoute.path}
                      underline="hover"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {currentRoute.label}
                    </Link>
                  );
                } else {
                  breadcrumbItems.push(
                    <Typography
                      key="current"
                      sx={{
                        color: 'text.primary',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                      }}
                    >
                      {currentRoute.label}
                    </Typography>
                  );
                }
              }

              if (isOnChildPage && currentChildLabel) {
                breadcrumbItems.push(
                  <Typography
                    key="child"
                    sx={{
                      color: 'text.primary',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    {currentChildLabel}
                  </Typography>
                );
              }

              return breadcrumbItems;
            })()}
          </Breadcrumbs>
          
          {/* Warehouse Selection Dropdown */}
          {warehouses.length > 0 && (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', mx: 1 }}>
              <Inventory2 
                sx={{ 
                  mr: 0.5,
                  fontSize: '1rem',
                  color: 'text.secondary',
                  display: { xs: 'none', sm: 'block' },
                }} 
              />
              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: { xs: 120, sm: 160 },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'background.paper',
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.5),
                    },
                    '&.Mui-focused': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              >
                <Select
                  value={activeWarehouse?.name || activeWarehouse?.warehouse_name || ''}
                  onChange={handleWarehouseChange}
                  displayEmpty
                  disabled={isLoading}
                  sx={{
                    fontSize: '0.75rem',
                    '& .MuiSelect-select': {
                      py: 0.75,
                      px: 1,
                      display: 'flex',
                      alignItems: 'center',
                    },
                  }}
                >
                  {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse.name} value={warehouse.name} sx={{ py: 0.75, fontSize: '0.75rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}>
                        <Inventory2 sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                        <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                          {warehouse.warehouse_name || warehouse.name}
                        </Typography>
                        {warehouse.is_default && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'primary.main',
                              fontWeight: 600,
                              fontSize: '0.6rem',
                              ml: 'auto',
                            }}
                          >
                            (Default)
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          
          {/* Quick Access POS Button */}
          <Tooltip title="Open Point of Sale">
            <Button
              variant="contained"
              size="small"
              startIcon={<PointOfSale sx={{ fontSize: '1rem' }} />}
              onClick={() => handleNavigation('/sales')}
              sx={{
                ml: 1,
                mr: 0.5,
                display: { xs: 'none', sm: 'flex' },
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                borderRadius: 1.5,
                boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.25)}`,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                  boxShadow: `0 3px 8px ${alpha(theme.palette.primary.main, 0.35)}`,
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              POS
            </Button>
          </Tooltip>

          {/* Mobile POS Button */}
          <Tooltip title="Open Point of Sale">
            <IconButton
              size="small"
              onClick={() => handleNavigation('/sales')}
              sx={{
                ml: 1,
                mr: 0.5,
                display: { xs: 'flex', sm: 'none' },
                color: 'white',
                backgroundColor: theme.palette.primary.main,
                p: 0.75,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
                transition: 'all 0.2s ease-in-out',
                boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.25)}`,
              }}
            >
              <PointOfSale sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          </Tooltip>
          
          {/* System Status */}
          <SystemStatus onSync={handleSync} />
          
          {/* Theme Toggle */}
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton 
              onClick={toggleColorMode} 
              sx={{ 
                ml: 1,
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
          
          {/* User Menu */}
          <Tooltip title={user?.full_name || user?.email || 'User'}>
            <IconButton
              onClick={handleUserMenuOpen}
              size="small"
              sx={{
                ml: 0.5,
                p: 0.25,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  bgcolor: 'primary.main',
                  fontSize: '0.75rem',
                }}
              >
                {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      )}
      
      {/* Hide drawer and navigation for POS route */}
      {!isPOSRoute && (
        <Box
          component="nav"
          sx={{ 
            width: { md: collapsedDrawerWidth },
            flexShrink: 0,
          }}
        >
          {/* Mobile Drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                borderRight: 1,
                borderColor: 'divider',
                borderRadius: 0,
              },
            }}
          >
            {drawer}
          </Drawer>

          {/* Desktop Drawer - Always collapsed, expands on hover as overlay */}
          <Drawer
            variant="permanent"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: currentDrawerWidth,
                borderRight: 1,
                borderColor: 'divider',
                borderRadius: 0,
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.easeOut,
                  duration: 200,
                }),
                overflowX: 'hidden',
                zIndex: isExpanded ? theme.zIndex.drawer + 1 : theme.zIndex.drawer,
                boxShadow: isExpanded ? '4px 0 12px rgba(0,0,0,0.1)' : 'none',
                backgroundColor: 'background.paper',
              },
            }}
            open
          >
            {drawer}

            {/* Toggle indicator at bottom */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: 'text.secondary',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    color: 'primary.main',
                  },
                }}
              >
                {isExpanded ? (
                  <ChevronLeft sx={{ fontSize: '1rem' }} />
                ) : (
                  <ChevronRight sx={{ fontSize: '1rem' }} />
                )}
              </Box>
            </Box>
          </Drawer>
        </Box>
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {!isPOSRoute && <Toolbar sx={{ minHeight: 44 }} />}
        <Box 
          sx={{ 
            flexGrow: 1, 
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {/* Page Sidebar for child navigation */}
          {!isPOSRoute && !isMobile && <PageSidebar />}

          {/* Main Content */}
          <Box
            sx={{
              flexGrow: 1,
              p: isPOSRoute ? 0 : 2,
              overflow: 'auto',
            minWidth: 0,
          }}
        >
          {children}
          </Box>
        </Box>
      </Box>
      
      {/* User Menu Component */}
      <UserMenu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
      />
    </Box>
  );
};

export default Layout;

