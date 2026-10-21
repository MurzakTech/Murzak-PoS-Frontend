import React, { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { isTokenValid } from '../store/authSlice';
import { IS_TENANT_BUILD } from '../config/deployment';
import ProtectedRoute from '../components/ProtectedRoute';
import NewLookGate from '../newlook/NewLookGate';
import NewLookShell from '../newlook/NewLookShellConnected';
import { FullPageLoader, PageSkeleton } from '../components/Common';

const Landing = lazy(() => import('../pages/Landing'));
const HomePage = lazy(() => import('../newlook/home/HomePage'));

const LoadingFallback = FullPageLoader;
const ContentLoadingFallback = PageSkeleton;

/**
 * RootRoute manages the "/" entrypoint for all deployment modes:
 *
 * 1. Authenticated User (any build):
 *    Directly renders the NewLook POS Dashboard (HomePage) inside the canonical shell.
 *
 * 2. Unauthenticated Visitor on Tenant Build (<shop>.pos.murzaktech.tech):
 *    Tenant POS instances have no public landing page or open registration;
 *    unauthenticated visits cleanly redirect to "/login".
 *
 * 3. Unauthenticated Visitor on Shared SaaS Build (pos.murzaktech.tech):
 *    Renders the public Landing marketing page.
 */
const RootRoute = () => {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  const hasValidToken = Boolean(token && isTokenValid(token));

  // If authenticated or holding a valid session token, render the protected POS home screen
  if (isAuthenticated || hasValidToken) {
    return (
      <ProtectedRoute>
        <NewLookGate>
          <NewLookShell>
            <Suspense fallback={<ContentLoadingFallback />}>
              <HomePage />
            </Suspense>
          </NewLookShell>
        </NewLookGate>
      </ProtectedRoute>
    );
  }

  // While auth state is actively initializing/loading with no established token, show branded splash
  if (isLoading) {
    return <LoadingFallback />;
  }

  // Unauthenticated tenant visitors go straight to sign-in
  if (IS_TENANT_BUILD) {
    return <Navigate to="/login" replace />;
  }

  // Unauthenticated shared-instance visitors see the marketing landing page
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Landing />
    </Suspense>
  );
};

export default RootRoute;
