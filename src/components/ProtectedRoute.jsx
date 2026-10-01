import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import Layout from './Layout/Layout';
import useRoleAccess from '../hooks/useRoleAccess';

// Content loader component for use within Layout
const ContentLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 200px)',
      width: '100%',
    }}
  >
    <CircularProgress />
  </Box>
);

const ProtectedRoute = ({ children, requireOnboarding = true, requiredRoles = null }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);
  const { isCompleted: onboardingCompleted } = useAppSelector((state) => state.onboarding);
  const { hasAccess, hasRole, roles } = useRoleAccess();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Check if user has company data (staff users have company data but may not have onboarding_completed flag)
  const hasCompanyData = user?.company || user?.company_name || user?.company_data;
  const companyStr = localStorage.getItem('company');
  const hasCompanyInStorage = !!companyStr;
  
  // User is considered to have completed onboarding if:
  // 1. onboarding_completed flag is set to true, OR
  // 2. User has company data (staff users work for a company, so they don't need onboarding)
  const shouldSkipOnboarding = onboardingCompleted || hasCompanyData || hasCompanyInStorage;

  // Wait for initial auth check to complete before making routing decisions
  useEffect(() => {
    // Check if we have a token in localStorage to determine if we should wait
    const token = localStorage.getItem('access_token');
    if (token) {
      // If we have a token, wait for auth state to initialize
      // The auth state should be set by getInitialState() immediately, but we wait
      // a tick to ensure Redux state is ready
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // No token, no need to wait
      setIsInitializing(false);
    }
  }, []);

  // Also stop initializing once auth state is determined (not loading)
  useEffect(() => {
    if (!isLoading) {
      setIsInitializing(false);
    }
  }, [isLoading]);

  // Check if children includes Layout component
  const hasLayout = React.Children.toArray(children).some(
    child => React.isValidElement(child) && child.type === Layout
  );

  // Show loading while initializing auth state
  if (isInitializing || isLoading) {
    // If Layout is present, render it with loader inside
    if (hasLayout) {
      return (
        <Layout>
          <ContentLoader />
        </Layout>
      );
    }
    // Otherwise show full-screen loader (for routes without Layout)
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated → redirect to login (preserving intended destination)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If onboarding is required but not completed, and not already on onboarding page
  // Skip onboarding check if user has company data (staff users don't need onboarding)
  if (requireOnboarding && !shouldSkipOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If onboarding is completed (or user has company data) and user tries to access onboarding page, redirect to dashboard
  if (shouldSkipOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check role-based access
  // If requiredRoles is specified, check if user has one of those roles
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasRole(requiredRoles)) {
      // User doesn't have required role - show unauthorized message
      return (
        <Layout>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 'calc(100vh - 200px)',
              p: 3,
            }}
          >
            <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
              <Typography variant="h5" gutterBottom color="error">
                Access Denied
              </Typography>
              <Typography variant="body1" color="text.secondary">
                You don't have permission to access this page. Required roles: {requiredRoles.join(', ')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Your current roles: {roles.length > 0 ? roles.join(', ') : 'None'}
              </Typography>
            </Paper>
          </Box>
        </Layout>
      );
    }
  } else {
    // Check if user has access to the current route path
    // Skip check for public routes like /onboarding
    const publicPaths = ['/onboarding', '/login', '/register'];
    if (!publicPaths.includes(location.pathname) && !hasAccess(location.pathname)) {
      // User doesn't have access to this route - redirect to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;