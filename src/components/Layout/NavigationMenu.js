import React, { useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { List, Box, Divider, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Dashboard,
  Inventory,
  PointOfSale,
  Warehouse,
  People,
  Assessment,
  Settings,
  History,
  Badge,
  Add,
  AttachMoney,
  Category,
  Upload,
  Inventory2,
  PriceCheck,
  Straighten,
  Folder,
  BrandingWatermark,
  Verified,
  Business,
  ShoppingCart,
  AssignmentReturn,
  AccountBalance,
  Receipt,
  Description,
  Warning,
  Input,
  Output,
  SwapHoriz,
  Edit,
  Sync,
  Book,
  Group,
  List as ListIcon,
  ListAlt,
  CreditCard,
  LocalOffer,
  Security,
  CloudDownload,
} from '@mui/icons-material';
import { getNavigationRoutes } from '../../routes/routes';
import NavigationItem from './NavigationItem';
import useRoleAccess from '../../hooks/useRoleAccess';

// Icon mapping
const iconMap = {
  Dashboard,
  Inventory,
  PointOfSale,
  Warehouse,
  People,
  Assessment,
  Settings,
  History,
  Badge,
  Add,
  AttachMoney,
  Category,
  Upload,
  Inventory2,
  PriceCheck,
  Straighten,
  Folder,
  BrandingWatermark,
  Verified,
  Business,
  ShoppingCart,
  AssignmentReturn,
  AccountBalance,
  Receipt,
  Description,
  Warning,
  Input,
  Output,
  SwapHoriz,
  Edit,
  Sync,
  Book,
  Group,
  List: ListIcon,
  ListAlt,
  CreditCard,
  LocalOffer,
  Security,
  CloudDownload,
};

const NavigationMenu = React.memo(({ desktopOpen, onNavigate }) => {
  const theme = useTheme();
  const location = useLocation();
  const { filterRoutes, hasAccess } = useRoleAccess();
  const allNavigationRoutes = useMemo(() => getNavigationRoutes(), []);
  
  // Filter routes based on user roles - only show top-level menu items
  const navigationRoutes = useMemo(() => {
    return filterRoutes(allNavigationRoutes).filter((route) => !route.hideFromMenu);
  }, [allNavigationRoutes, filterRoutes]);
  
  // Separate main routes from bottom-fixed routes (like Settings)
  const { mainRoutes, bottomRoutes } = useMemo(() => {
    const main = navigationRoutes.filter((route) => !route.isBottomFixed);
    const bottom = navigationRoutes.filter((route) => route.isBottomFixed);
    return { mainRoutes: main, bottomRoutes: bottom };
  }, [navigationRoutes]);

  // Check if a route is selected (including child paths)
  const isRouteSelected = useCallback((route) => {
    // Exact match
    if (location.pathname === route.path) return true;
    // Check if current path starts with route path (for nested pages)
    if (route.path !== '/dashboard' && location.pathname.startsWith(route.path + '/')) return true;
    // Check pageChildren if defined
    if (route.pageChildren) {
      return route.pageChildren.some((child) => {
        if (location.pathname === child.path) return true;
        if (child.path !== route.path && location.pathname.startsWith(child.path + '/')) return true;
        return false;
      });
    }
    // Check children if defined (for backwards compatibility during transition)
    if (route.children) {
      return route.children.some((child) => {
        if (child.path.includes(':')) {
          const basePath = child.path.split(':')[0];
          return location.pathname.startsWith(basePath);
        }
        return location.pathname === child.path || location.pathname.startsWith(child.path + '/');
      });
    }
    return false;
  }, [location.pathname]);

  // Helper function to filter and check route access
  const filterRouteAccess = useCallback((route) => {
    if (route.hideFromMenu) return false;
    return hasAccess(route.path);
  }, [hasAccess]);

  // Helper function to render a route item
  const renderRouteItem = useCallback((route) => {
    const IconComponent = iconMap[route.icon] || iconMap.Dashboard || Inventory;
    const isSelected = isRouteSelected(route);

    return (
      <NavigationItem
        key={route.path || route.label}
        route={route}
        isSelected={isSelected}
        isExpanded={false}
        hasChildren={false}
        desktopOpen={desktopOpen}
        IconComponent={IconComponent}
        onNavigate={onNavigate}
        onToggleExpand={() => {}}
        isChildSelected={() => false}
      />
    );
  }, [desktopOpen, isRouteSelected, onNavigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Main Navigation Routes */}
    <List sx={{ 
      flex: 1, 
        px: 0.25,
        py: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      scrollBehavior: 'smooth',
      '&::-webkit-scrollbar': {
          width: '3px',
        },
        '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.text.secondary, 0.2),
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: alpha(theme.palette.text.secondary, 0.3),
        },
      }}>
        {mainRoutes.filter(filterRouteAccess).map(renderRouteItem)}
      </List>

      {/* Bottom Fixed Routes (Settings) */}
      {bottomRoutes.filter(filterRouteAccess).length > 0 && (
        <Box sx={{ flexShrink: 0, pb: 5 }}>
          <Divider sx={{ mx: 1, my: 0.5 }} />
          <List sx={{ px: 0.25, py: 0.5 }}>
            {bottomRoutes.filter(filterRouteAccess).map(renderRouteItem)}
          </List>
        </Box>
      )}
    </Box>
  );
});

NavigationMenu.displayName = 'NavigationMenu';

export default NavigationMenu;

