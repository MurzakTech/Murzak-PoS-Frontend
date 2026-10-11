import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
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
  AddShoppingCart,
  Send,
  LocalShipping,
} from '@mui/icons-material';
import { getNavigationRoutes } from '../../routes/routes';
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
  AddShoppingCart,
  Send,
  LocalShipping,
};

const PageSidebar = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const routes = useMemo(() => getNavigationRoutes(), []);
  const { hasAccess } = useRoleAccess();

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
        width: 196,
        minWidth: 196,
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
        {/* Only list pages this user may open; the others would bounce them to the dashboard. */}
        {currentParentRoute.pageChildren.filter((child) => hasAccess(child.path)).map((child, index, visible) => {
          const IconComponent = iconMap[child.icon] || Dashboard;
          const isSelected = isChildSelected(child.path);
          // Long lists (Settings) are grouped; a small heading starts each group
          const startsGroup = child.group && child.group !== visible[index - 1]?.group;

          return (
            <React.Fragment key={child.path}>
              {startsGroup && (
                <Typography
                  variant="overline"
                  component="li"
                  sx={{ display: 'block', listStyle: 'none', px: 1, pt: index === 0 ? 0 : 1.5, pb: 0.25, color: 'text.disabled', lineHeight: 1.8 }}
                >
                  {child.group}
                </Typography>
              )}
            <ListItem disablePadding sx={{ mb: 0.125 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => handleNavigate(child.path)}
                sx={{
                  borderRadius: 1,
                  minHeight: 38,
                  py: 0.5,
                  px: 1.25,
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
                    minWidth: 30,
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IconComponent sx={{ fontSize: '1.1rem' }} />
                </ListItemIcon>
                <ListItemText
                  primary={child.label}
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};

export default PageSidebar;
