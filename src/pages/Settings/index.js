import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useRoleAccess from '../../hooks/useRoleAccess';

// Settings pages in menu order; /settings opens the first one the person's role allows
const SETTINGS_PAGES = [
  '/settings/pos-profile',
  '/settings/business',
  '/settings/etims',
  '/settings/bank-accounts',
  '/settings/account-provisioning',
  '/settings/payment-methods',
  '/settings/payment-gateways',
  '/settings/inventory-discounts',
  '/settings/loyalty-programs',
  '/settings/audit-trail',
];

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess } = useRoleAccess();

  // Redirect to default child route if on parent route
  useEffect(() => {
    if (location.pathname === '/settings') {
      navigate(SETTINGS_PAGES.find((page) => hasAccess(page)) || '/dashboard', { replace: true });
    }
  }, [location.pathname, navigate, hasAccess]);

  return <Outlet />;
};

export default Settings;
