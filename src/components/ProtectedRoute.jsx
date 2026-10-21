import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import useRoleAccess from '../hooks/useRoleAccess';
import logoMark from '../assets/logo_mark.png';

const LoadingSplash = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--surface-sunken)',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    }}
    role="status"
    aria-live="polite"
    aria-label="Loading application"
  >
    <div style={{ textAlign: 'center' }}>
      <img
        src={logoMark}
        alt="Murzak POS"
        style={{
          width: 48,
          height: 48,
          display: 'block',
          margin: '0 auto 16px',
          opacity: 0.85,
        }}
      />
      <div
        style={{
          width: 96,
          height: 4,
          background: 'var(--brand-primary)',
          borderRadius: 4,
          margin: '0 auto',
          opacity: 0.8,
        }}
      />
    </div>
  </div>
);

const AccessDenied = ({ requiredRoles, currentRoles }) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 'var(--space-4, 16px)',
      background: 'var(--surface-sunken)',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      color: 'var(--ink)',
    }}
  >
    <div
      style={{
        maxWidth: 480,
        width: '100%',
        padding: '32px 24px',
        textAlign: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-card, 12px)',
        boxShadow: 'var(--card-shadow, none)',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: 'var(--line)',
          color: 'var(--bad)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 24,
        }}
      >
        🔒
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
        Access Denied
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
        You do not have permission to access this page.
        {requiredRoles?.length > 0 && (
          <span style={{ display: 'block', marginTop: 4 }}>
            Required: <strong>{requiredRoles.join(', ')}</strong>
          </span>
        )}
      </p>
      {currentRoles?.length > 0 && (
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--muted)' }}>
          Your current roles: {currentRoles.join(', ')}
        </p>
      )}
      <a
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--on-brand, inherit)',
          background: 'var(--brand-primary)',
          borderRadius: 'var(--radius-button, 8px)',
          textDecoration: 'none',
        }}
      >
        Return to Home
      </a>
    </div>
  </div>
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
    const token = localStorage.getItem('access_token');
    if (token) {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsInitializing(false);
    }
  }, []);

  // Also stop initializing once auth state is determined (not loading)
  useEffect(() => {
    if (!isLoading) {
      setIsInitializing(false);
    }
  }, [isLoading]);

  // Show loading while initializing auth state
  if (isInitializing || isLoading) {
    return <LoadingSplash />;
  }

  // If not authenticated → redirect to login (preserving intended destination)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If onboarding is required but not completed, and not already on onboarding/setup page
  if (requireOnboarding && !shouldSkipOnboarding && location.pathname !== '/setup' && location.pathname !== '/onboarding') {
    return <Navigate to="/setup" replace />;
  }

  // If onboarding is completed and user tries to access legacy onboarding page, redirect to home
  if (shouldSkipOnboarding && (location.pathname === '/onboarding' || location.pathname === '/setup')) {
    // Only redirect away from /onboarding; /setup can be visited to review or edit setup
    if (location.pathname === '/onboarding') {
      return <Navigate to="/" replace />;
    }
  }

  // Check role-based access
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasRole(requiredRoles)) {
      return <AccessDenied requiredRoles={requiredRoles} currentRoles={roles} />;
    }
  } else {
    // Check if user has access to the current route path
    const publicPaths = ['/onboarding', '/login', '/register', '/forgot-password'];
    if (!publicPaths.includes(location.pathname) && !hasAccess(location.pathname)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
