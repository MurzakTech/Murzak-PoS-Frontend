import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
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
  TrendingUp,
  Summarize,
  Checklist,
  Analytics,
  Schedule,
  Star,
  Compare,
  Autorenew,
  CalendarToday,
  Timeline,
} from '@mui/icons-material';
import { getNavigationRoutes } from '../../routes/routes';

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
  TrendingUp,
  Summarize,
  Checklist,
  Analytics,
  Schedule,
  Star,
  Compare,
  Autorenew,
  CalendarToday,
  Timeline,
};

const PageSidebar = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const routes = useMemo(() => getNavigationRoutes(), []);

  // Find the current parent route that has pageChildren
  const currentParentRoute = useMemo(() => {
    // First, find exact match for parent with pageChildren
    let parent = routes.find(
      (route) => route.pageChildren && route.path === location.pathname
    );

    // If not found, check if current path starts with any parent path
    if (!parent) {
      parent = routes.find((route) => {
        if (!route.pageChildren) return false;
        // Check if current path is a child of this parent
        return (
          location.pathname.startsWith(route.path + '/') ||
          route.pageChildren.some(
            (child) =>
              location.pathname === child.path ||
              location.pathname.startsWith(child.path + '/')
          )
        );
      });
    }

    return parent;
  }, [routes, location.pathname]);

  // If no parent route with pageChildren, don't render
  if (!currentParentRoute || !currentParentRoute.pageChildren) {
    return null;
  }

  const handleNavigate = (path) => {
    navigate(path);
  };

  const isChildSelected = (childPath) => {
    if (location.pathname === childPath) return true;
    if (childPath !== currentParentRoute.path && location.pathname.startsWith(childPath + '/')) return true;
    return false;
  };

  return (
    <Box
      sx={{
        width: 180,
        minWidth: 180,
        borderRight: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Navigation Items */}
      <List sx={{ flex: 1, px: 0.75, py: 1.5, overflowY: 'auto' }}>
        {currentParentRoute.pageChildren.map((child) => {
          const IconComponent = iconMap[child.icon] || Dashboard;
          const isSelected = isChildSelected(child.path);

          return (
            <ListItem key={child.path} disablePadding sx={{ mb: 0.125 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => handleNavigate(child.path)}
                sx={{
                  borderRadius: 0.5,
                  minHeight: 32,
                  py: 0.5,
                  px: 1,
                  position: 'relative',
                  '&.Mui-selected': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: 2,
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: '0 2px 2px 0',
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    },
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    },
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      color: theme.palette.primary.main,
                    },
                  },
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.action.hover, 0.04),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 24,
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IconComponent sx={{ fontSize: '0.875rem' }} />
                </ListItemIcon>
                <ListItemText
                  primary={child.label}
                  primaryTypographyProps={{
                    fontSize: '0.6875rem',
                    fontWeight: isSelected ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default PageSidebar;
