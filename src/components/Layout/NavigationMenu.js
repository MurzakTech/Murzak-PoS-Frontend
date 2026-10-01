import React, { useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { List, Box, Divider, Typography } from '@mui/material';
import { getNavigationRoutes } from '../../routes/routes';
import NavigationItem from './NavigationItem';
import iconMap from './iconMap';
import useRoleAccess from '../../hooks/useRoleAccess';

/**
 * Sidebar sections. Grouping by the job a person is doing ("Sell", "Stock",
 * "Buy") is easier to learn than one long flat list of 12 modules.
 *
 * Any route that is not listed here falls into "More", so adding a new
 * module to routes.js never makes it disappear from the menu.
 */
const NAV_GROUPS = [
  { title: null, paths: ['/dashboard'] },
  { title: 'Sell', paths: ['/sales', '/customers'] },
  { title: 'Stock', paths: ['/products', '/inventory', '/warehouses', '/stock-transfers'] },
  { title: 'Buy', paths: ['/purchases', '/suppliers'] },
  { title: 'Insights', paths: ['/reports'] },
  { title: 'Team', paths: ['/staff', '/roles'] },
];
const BOTTOM_PATHS = ['/settings'];

const NavigationMenu = React.memo(({ desktopOpen, onNavigate }) => {
  const location = useLocation();
  const { filterRoutes, hasAccess } = useRoleAccess();
  const allNavigationRoutes = useMemo(() => getNavigationRoutes(), []);

  // Only top-level, visible routes this person is allowed to open
  const visibleRoutes = useMemo(
    () => filterRoutes(allNavigationRoutes).filter((r) => !r.hideFromMenu && r.path !== '*' && hasAccess(r.path)),
    [allNavigationRoutes, filterRoutes, hasAccess]
  );

  const sections = useMemo(() => {
    const byPath = new Map(visibleRoutes.map((r) => [r.path, r]));
    const used = new Set(BOTTOM_PATHS);
    const result = NAV_GROUPS.map((g) => {
      const routes = g.paths.map((p) => byPath.get(p)).filter(Boolean);
      g.paths.forEach((p) => used.add(p));
      return { title: g.title, routes };
    }).filter((s) => s.routes.length > 0);

    const leftovers = visibleRoutes.filter((r) => !used.has(r.path));
    if (leftovers.length) result.push({ title: 'More', routes: leftovers });

    const bottom = BOTTOM_PATHS.map((p) => byPath.get(p)).filter(Boolean);
    return { main: result, bottom };
  }, [visibleRoutes]);

  // A route is "selected" for its own page and for any page nested inside it
  const isRouteSelected = useCallback(
    (route) => {
      const path = location.pathname;
      if (path === route.path) return true;
      if (route.path !== '/dashboard' && path.startsWith(route.path + '/')) return true;
      if (route.pageChildren) {
        return route.pageChildren.some(
          (c) => path === c.path || (c.path !== route.path && path.startsWith(c.path + '/'))
        );
      }
      return false;
    },
    [location.pathname]
  );

  const renderItem = (route) => (
    <NavigationItem
      key={route.path}
      route={route}
      isSelected={isRouteSelected(route)}
      desktopOpen={desktopOpen}
      IconComponent={iconMap[route.icon] || iconMap.Dashboard}
      onNavigate={onNavigate}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box component="nav" aria-label="Main" sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.5, py: 0.5 }}>
        {sections.main.map((section, i) => (
          <Box key={section.title || 'top'} sx={{ mt: i === 0 ? 0 : 1 }}>
            {section.title &&
              (desktopOpen ? (
                <Typography
                  variant="overline"
                  sx={{ display: 'block', px: 1.5, pb: 0.25, color: 'text.disabled', lineHeight: 1.7 }}
                >
                  {section.title}
                </Typography>
              ) : (
                <Divider sx={{ mx: 1, mb: 1 }} />
              ))}
            <List disablePadding>{section.routes.map(renderItem)}</List>
          </Box>
        ))}
      </Box>

      {sections.bottom.length > 0 && (
        <Box sx={{ px: 1.5, pb: 1 }}>
          <Divider sx={{ mb: 1 }} />
          <List disablePadding>{sections.bottom.map(renderItem)}</List>
        </Box>
      )}
    </Box>
  );
});

NavigationMenu.displayName = 'NavigationMenu';

export default NavigationMenu;
