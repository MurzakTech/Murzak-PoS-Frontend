import React from 'react';
import { useAccess } from '../access/AccessProvider';
import { useAppSelector } from '../../store/hooks';
import FullHome from './HomePage';
import RoleDashboard from './RoleDashboard';
import { rolesOf, usesFullHome } from './roleDashboardModel';

/**
 * The page at Home. An owner, and anyone holding a role that opens every page, keeps the full Home (HomePage). Everyone else gets a Home built
 * from the modules their roles open (RoleDashboard). A person whose roles cannot be read keeps the full Home, as before; the server still
 * decides which figures come back.
 */
const HomeRoute = () => {
  const access = useAccess();
  const user = useAppSelector((state) => state.auth.user);
  return usesFullHome({ tier: access.tier, roles: rolesOf(user) }) ? <FullHome /> : <RoleDashboard />;
};

export default HomeRoute;
