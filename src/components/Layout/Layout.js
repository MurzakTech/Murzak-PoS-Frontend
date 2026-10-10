import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Tooltip,
  Button,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
  ButtonBase,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  DarkModeOutlined,
  LightModeOutlined,
  PointOfSale,
  StorefrontOutlined,
  NavigateNext,
  Search,
  HelpOutline,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useThemeMode } from '../../theme/ThemeProvider';
import { getNavigationRoutes } from '../../routes/routes';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { listWarehouses, getDefaultWarehouse, setActiveWarehouse } from '../../store/warehouseSlice';
import UserMenu from './UserMenu';
import SystemStatus from './SystemStatus';
import NavigationMenu from './NavigationMenu';
import PageSidebar from './PageSidebar';
import CommandPalette from './CommandPalette';
import MobileBottomNav from './MobileBottomNav';
import BrandLogo from '../Common/BrandLogo';
import ErrorBoundary from '../Common/ErrorBoundary';

const SIDEBAR_KEY = 'sidebarCollapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

// Work out the "Home > Section > Page" trail for the current URL
const buildBreadcrumbs = (pathname, routes) => {
  const current = routes.find((r) => {
    if (pathname === r.path) return true;
    if (r.pageChildren) {
      return r.pageChildren.some((c) => pathname === c.path || pathname.startsWith(c.path + '/'));
    }
    return pathname.startsWith(r.path + '/');
  });
  if (!current) return [];

  const dynamicChild = routes.find(
    (r) => r.hideFromMenu && r.parentPath && pathname.startsWith(r.path.split(':')[0])
  );
  const matchedChild = current.pageChildren?.find(
    (c) => c.path !== current.path && (pathname === c.path || pathname.startsWith(c.path + '/'))
  );
  const childLabel = matchedChild?.label || dynamicChild?.label || null;

  return childLabel
    ? [{ label: current.label, to: current.path }, { label: childLabel }]
    : [{ label: current.label }];
};

const Layout = ({ children }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleColorMode } = useThemeMode();
  const { user } = useAppSelector((state) => state.auth);
  const { warehouses, activeWarehouse, defaultWarehouse, isLoading } = useAppSelector((state) => state.warehouse);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { sidebar, topbarHeight } = theme.custom;
  const railWidth = collapsed ? sidebar.collapsedWidth : sidebar.width;
  const navigationRoutes = useMemo(() => getNavigationRoutes(), []);
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(location.pathname, navigationRoutes),
    [location.pathname, navigationRoutes]
  );

  // The point-of-sale screen and the kitchen station screen are full-screen, without the app shell
  const isPOSRoute = location.pathname === '/sales' || location.pathname === '/sales/pos' || location.pathname === '/kitchen';

  const userCompany =
    user?.company ||
    user?.custom_company ||
    user?.company_name ||
    user?.company_data?.name ||
    user?.company_data?.company_name;

  useEffect(() => {
    if (userCompany) {
      dispatch(listWarehouses({ company: userCompany, limit: 1000 }));
      dispatch(getDefaultWarehouse({ company: userCompany }));
    }
  }, [dispatch, userCompany]);

  // Pick a sensible active store the first time stores load
  useEffect(() => {
    if (warehouses.length > 0 && !activeWarehouse) {
      const pick = defaultWarehouse || warehouses.find((w) => w.is_default) || warehouses[0];
      if (pick) dispatch(setActiveWarehouse(pick));
    }
  }, [warehouses, defaultWarehouse, activeWarehouse, dispatch]);

  // Ctrl/Cmd + K (or "/") opens quick search from anywhere
  useEffect(() => {
    if (isPOSRoute) return undefined;
    const onKeyDown = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPOSRoute]);

  const handleWarehouseChange = (event) => {
    const picked = warehouses.find((w) => w.name === event.target.value || w.warehouse_name === event.target.value);
    if (picked) dispatch(setActiveWarehouse(picked));
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch (e) {
        // preference just won't persist
      }
      return next;
    });
  };

  const handleNavigation = useCallback(
    (path) => {
      navigate(path);
      setMobileOpen(false);
    },
    [navigate]
  );

  const sidebarContent = (isCollapsed) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        sx={{
          height: topbarHeight,
          px: isCollapsed ? 0 : 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          flexShrink: 0,
        }}
      >
        <ButtonBase component={RouterLink} to="/dashboard" aria-label="Murzak POS home" sx={{ borderRadius: 2 }}>
          <BrandLogo size={isCollapsed ? 30 : 32} showText={!isCollapsed} textVariant="h5" />
        </ButtonBase>
      </Box>

      <NavigationMenu desktopOpen={!isCollapsed} onNavigate={handleNavigation} />

      {!isMobile && (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Tooltip title={isCollapsed ? 'Expand menu' : ''} placement="right">
            <Button
              fullWidth
              size="small"
              color="inherit"
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}
              startIcon={isCollapsed ? null : <ChevronLeft />}
              sx={{
                color: 'text.secondary',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                minWidth: 0,
                px: isCollapsed ? 0 : 1.5,
              }}
            >
              {isCollapsed ? <ChevronRight /> : 'Collapse menu'}
            </Button>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  const userInitial = (user?.first_name?.[0] || user?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Skip link for keyboard users */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          '&:focus': { left: 12, top: 12, zIndex: 2000, bgcolor: 'background.paper', p: 1.5, borderRadius: 2, boxShadow: 4 },
        }}
      >
        Skip to content
      </Box>

      {!isPOSRoute && (
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${railWidth}px)` },
            ml: { md: `${railWidth}px` },
            backgroundColor: (t) => alpha(t.palette.background.default, 0.85),
            backdropFilter: 'blur(10px)',
            borderBottom: 1,
            borderColor: 'divider',
            transition: theme.transitions.create(['width', 'margin'], { duration: 200 }),
          }}
        >
          <Toolbar sx={{ gap: 1, px: { xs: 1.5, sm: 2.5 } }}>
            <IconButton
              aria-label="Open menu"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' }, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>

            <Breadcrumbs
              separator={<NavigateNext sx={{ fontSize: '1rem', color: 'text.disabled' }} />}
              sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 0, mr: 1 }}
              aria-label="Breadcrumb"
            >
              {breadcrumbs.length === 0 && <Typography variant="subtitle2">Murzak POS</Typography>}
              {breadcrumbs.map((b, i) =>
                b.to && i < breadcrumbs.length - 1 ? (
                  <Link key={b.label} component={RouterLink} to={b.to} underline="hover" color="text.secondary" variant="subtitle2">
                    {b.label}
                  </Link>
                ) : (
                  <Typography key={b.label} variant="subtitle2" color="text.primary" noWrap>
                    {b.label}
                  </Typography>
                )
              )}
            </Breadcrumbs>

            {/* Quick search */}
            <ButtonBase
              onClick={() => setPaletteOpen(true)}
              aria-label="Search pages and actions"
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1,
                flex: '0 1 340px',
                minWidth: 0,
                height: 38,
                px: 1.5,
                borderRadius: 2.5,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                color: 'text.secondary',
                justifyContent: 'flex-start',
                transition: 'border-color .15s ease, box-shadow .15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.12)}`,
                },
              }}
            >
              <Search sx={{ fontSize: 18 }} />
              <Typography variant="body2" noWrap sx={{ flex: 1, textAlign: 'left' }}>
                Search or jump to...
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  px: 0.75,
                  py: 0.125,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  fontWeight: 600,
                  display: { xs: 'none', md: 'block' },
                }}
              >
                {/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}
              </Typography>
            </ButtonBase>
            <IconButton
              aria-label="Search pages and actions"
              onClick={() => setPaletteOpen(true)}
              sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: 'text.primary' }}
            >
              <Search />
            </IconButton>

            <Box sx={{ flexGrow: 1 }} />

            {warehouses.length > 0 && (
              <Select
                value={activeWarehouse?.name || activeWarehouse?.warehouse_name || ''}
                onChange={handleWarehouseChange}
                displayEmpty
                disabled={isLoading}
                size="small"
                IconComponent={KeyboardArrowDown}
                inputProps={{ 'aria-label': 'Active store' }}
                startAdornment={<StorefrontOutlined sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  minWidth: 150,
                  maxWidth: 220,
                  bgcolor: 'background.paper',
                  '& .MuiSelect-select': { py: 0.9, fontSize: '0.8125rem', fontWeight: 600 },
                }}
              >
                {warehouses.map((w) => (
                  <MenuItem key={w.name} value={w.name} sx={{ fontSize: '0.8125rem' }}>
                    {w.warehouse_name || w.name}
                    {w.is_default ? (
                      <Typography component="span" variant="caption" sx={{ ml: 1, color: 'primary.main', fontWeight: 700 }}>
                        Default
                      </Typography>
                    ) : null}
                  </MenuItem>
                ))}
              </Select>
            )}

            <Button
              variant="contained"
              startIcon={<PointOfSale />}
              onClick={() => handleNavigation('/sales')}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                background: (t) => t.custom.gradient,
                color: '#fff',
                boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.35)}`,
                '&:hover': { background: (t) => t.custom.gradient, filter: 'brightness(1.08)' },
              }}
            >
              Open POS
            </Button>
            <Tooltip title="Open point of sale">
              <IconButton
                aria-label="Open point of sale"
                onClick={() => handleNavigation('/sales')}
                sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: '#fff', background: (t) => t.custom.gradient }}
              >
                <PointOfSale />
              </IconButton>
            </Tooltip>

            <SystemStatus />

            <Tooltip title="Help and support">
              <IconButton
                component="a"
                href="/contact-us"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Help and support"
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: 'text.secondary' }}
              >
                <HelpOutline />
              </IconButton>
            </Tooltip>

            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton onClick={toggleColorMode} aria-label="Toggle colour theme" sx={{ color: 'text.secondary' }}>
                {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ my: 1.25, display: { xs: 'none', sm: 'block' } }} />

            <Tooltip title={user?.full_name || user?.email || 'Account'}>
              <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} aria-label="Account menu" sx={{ p: 0.5 }}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                >
                  {userInitial}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
      )}

      {!isPOSRoute && (
        <Box
          component="aside"
          sx={{ width: { md: railWidth }, flexShrink: 0, transition: theme.transitions.create('width', { duration: 200 }) }}
        >
          {/* Phone / tablet: slide-over menu */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { width: sidebar.width, maxWidth: '85vw', bgcolor: sidebar.background },
            }}
          >
            {sidebarContent(false)}
          </Drawer>

          {/* Desktop: permanent sidebar that never covers the page */}
          <Drawer
            variant="permanent"
            open
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                width: railWidth,
                boxSizing: 'border-box',
                bgcolor: sidebar.background,
                borderRight: 1,
                borderColor: 'divider',
                overflowX: 'hidden',
                transition: theme.transitions.create('width', { easing: theme.transitions.easing.easeOut, duration: 200 }),
              },
            }}
          >
            {sidebarContent(collapsed)}
          </Drawer>
        </Box>
      )}

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{ flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column', outline: 'none' }}
      >
        {!isPOSRoute && <Toolbar />}
        <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
          {!isPOSRoute && !isMobile && <PageSidebar />}
          <Box
            sx={{
              flexGrow: 1,
              p: isPOSRoute ? 0 : { xs: 2, md: 3 },
              // Phones: keep the last row of the page clear of the bottom tab bar
              pb: isPOSRoute ? 0 : { xs: 'calc(88px + env(safe-area-inset-bottom))', md: 3 },
              minWidth: 0,
              overflow: isPOSRoute ? 'hidden' : 'auto',
            }}
          >
            {/* resetKey clears an error automatically when the person navigates elsewhere */}
            <ErrorBoundary inline resetKey={location.pathname}>
              {children}
            </ErrorBoundary>
          </Box>
        </Box>
      </Box>

      {!isPOSRoute && isMobile && (
        <MobileBottomNav
          pathname={location.pathname}
          onNavigate={handleNavigation}
          onMore={() => setMobileOpen(true)}
          moreOpen={mobileOpen}
        />
      )}

      <UserMenu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={handleNavigation} />
    </Box>
  );
};

export default Layout;
