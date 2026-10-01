import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to default child route if on parent route
  useEffect(() => {
    if (location.pathname === '/settings') {
      navigate('/settings/pos-profile', { replace: true });
    }
  }, [location.pathname, navigate]);

  return <Outlet />;
};

export default Settings;

