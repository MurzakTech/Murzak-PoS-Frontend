import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { canAccessRoute, getAllowedRoutes, isRouteAllowed } from '../config/roleAccessConfig';

/**
 * Hook to check role-based access
 * @returns {Object} Access control utilities
 */
export const useRoleAccess = () => {
  const user = useAppSelector((state) => state.auth.user);
  const roles = useMemo(() => {
    // Get roles from user object
    // Roles can be in user.roles or user.role (singular)
    if (!user) return [];
    
    // Check if roles is an array
    if (Array.isArray(user.roles)) {
      return user.roles;
    }
    
    // Check if role is a string (single role)
    if (typeof user.role === 'string') {
      return [user.role];
    }
    
    return [];
  }, [user]);

  /**
   * Check if current user can access a specific route
   * @param {string} routePath - The route path to check
   * @returns {boolean}
   */
  const hasAccess = useMemo(() => {
    return (routePath) => {
      if (!roles || roles.length === 0) {
        return false;
      }
      return canAccessRoute(routePath, roles);
    };
  }, [roles]);

  /**
   * Get all allowed routes for current user
   * @returns {string[]}
   */
  const allowedRoutes = useMemo(() => {
    return getAllowedRoutes(roles);
  }, [roles]);

  /**
   * Check if a route matches any allowed route pattern
   * @param {string} routePath - The route path to check
   * @returns {boolean}
   */
  const isAllowed = useMemo(() => {
    return (routePath) => {
      return isRouteAllowed(routePath, allowedRoutes);
    };
  }, [allowedRoutes]);

  /**
   * Filter routes based on user's role access
   * @param {Array} routes - Array of route objects
   * @returns {Array} Filtered routes
   */
  const filterRoutes = useMemo(() => {
    return (routes) => {
      if (!routes || routes.length === 0) {
        return [];
      }

      return routes
        .map((route) => {
          // Check if main route is accessible
          const mainRouteAccessible = hasAccess(route.path);
          
          // If route has children, filter them first
          if (route.children && route.children.length > 0) {
            // Filter children to only include accessible ones (keep hidden routes for access checking)
            const filteredChildren = route.children.filter((child) => {
              // Keep hidden routes (they're accessed via links, but still need access check)
              if (child.hideFromMenu) {
                return hasAccess(child.path);
              }
              return hasAccess(child.path);
            });
            
            // Check if there are any visible (non-hidden) accessible children
            const hasVisibleAccessibleChildren = filteredChildren.some(
              (child) => !child.hideFromMenu
            );
            
            // Only include route if:
            // 1. Main route is accessible, OR
            // 2. Has at least one visible accessible child
            if (mainRouteAccessible || hasVisibleAccessibleChildren) {
              return {
                ...route,
                children: filteredChildren,
              };
            }
            
            // No accessible main route and no visible accessible children - hide this route
            return null;
          }
          
          // Route without children - only include if accessible
          return mainRouteAccessible ? route : null;
        })
        .filter((route) => route !== null); // Remove null routes (filtered out)
    };
  }, [hasAccess]);

  /**
   * Check if user has any of the specified roles
   * @param {string[]} requiredRoles - Roles to check
   * @returns {boolean}
   */
  const hasRole = useMemo(() => {
    return (requiredRoles) => {
      if (!requiredRoles || requiredRoles.length === 0) {
        return true; // No role requirement means accessible
      }
      return requiredRoles.some((role) => roles.includes(role));
    };
  }, [roles]);

  /**
   * Check if user has all of the specified roles
   * @param {string[]} requiredRoles - Roles to check
   * @returns {boolean}
   */
  const hasAllRoles = useMemo(() => {
    return (requiredRoles) => {
      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }
      return requiredRoles.every((role) => roles.includes(role));
    };
  }, [roles]);

  return {
    roles,
    hasAccess,
    allowedRoutes,
    isAllowed,
    filterRoutes,
    hasRole,
    hasAllRoles,
    isAdmin: roles.includes('Administrator') || roles.includes('System Manager'),
  };
};

export default useRoleAccess;

