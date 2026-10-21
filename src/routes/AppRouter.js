import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { publicRoutes, protectedRoutes, protectedRoutesWithoutLayout, routes } from './routes';
import ProtectedRoute from '../components/ProtectedRoute';
import IdleSignOut from '../components/IdleSignOut';
import { ErrorBoundary, FullPageLoader, PageSkeleton } from '../components/Common';
import NewLookGate from '../newlook/NewLookGate';
import NewLookShell from '../newlook/NewLookShellConnected';
import { newLookRoutes } from '../newlook/newLookRoutes';
import LegacyRedirects from '../newlook/redirects/LegacyRedirects';

// Fullscreen Point of Sale & Kitchen screens (no shell)
const NewSale = lazy(() => import('../pages/Sales/NewSale'));
const KitchenStation = lazy(() => import('../pages/Kitchen'));

// Branded splash for public pages; layout-shaped skeleton inside the app shell
const LoadingFallback = FullPageLoader;
const ContentLoadingFallback = PageSkeleton;

/**
 * Extracts all unique flattened routes from protectedRoutes (both parents and nested children)
 * so every page can be mounted with direct, top-level route matching.
 */
const getFlattenedProtectedRoutes = (routesList) => {
  const result = [];
  const seenPaths = new Set();

  const addRoute = (r) => {
    if (!r || !r.path || !r.element) return;
    // Exclude standalone fullscreen routes handled explicitly
    if (r.path === '/sales/pos' || r.path === '/kitchen') return;
    if (seenPaths.has(r.path)) return;
    seenPaths.add(r.path);
    result.push(r);
  };

  routesList.forEach((route) => {
    if (route.children && Array.isArray(route.children)) {
      route.children.forEach(addRoute);
    }
    addRoute(route);
  });

  return result;
};

const AppRouter = () => {
  const flattenedBackOfficeRoutes = getFlattenedProtectedRoutes(protectedRoutes);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <IdleSignOut />
        {/* Legacy redirect handler: maps old URLs directly to canonical paths */}
        <LegacyRedirects>
          <Routes>
            {/* Public routes (without Shell) */}
            {publicRoutes.map((route) => {
              const Component = route.element;
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <Component />
                    </Suspense>
                  }
                />
              );
            })}
            
            {/* Redirect old onboarding route to modern setup wizard */}
            <Route
              path="/onboarding"
              element={<Navigate to="/setup" replace />}
            />
            
            {/* Protected routes without Shell (e.g., onboarding / password resets) */}
            {protectedRoutesWithoutLayout.map((route) => {
              const Component = route.element;
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <ProtectedRoute requireOnboarding={false}>
                      <Suspense fallback={<LoadingFallback />}>
                        <Component />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
              );
            })}

            {/* Standalone Fullscreen Point of Sale till (no shell) */}
            <Route
              path="/sales/pos"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <NewSale />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            {/* Standalone Fullscreen Kitchen Station (no shell) */}
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <KitchenStation />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            
            {/* Canonical Redesigned screens (New look shell) */}
            {newLookRoutes.map((route) => {
              const Component = route.element;
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <ProtectedRoute>
                      <NewLookGate>
                        <NewLookShell>
                          <Suspense fallback={<ContentLoadingFallback />}>
                            <Component />
                          </Suspense>
                        </NewLookShell>
                      </NewLookGate>
                    </ProtectedRoute>
                  }
                />
              );
            })}

            {/* All un-migrated back-office screens rendered inside NewLookShell */}
            {flattenedBackOfficeRoutes.map((route) => {
              const Component = route.element;
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <ProtectedRoute>
                      <NewLookGate>
                        <NewLookShell>
                          <Suspense fallback={<ContentLoadingFallback />}>
                            <Component />
                          </Suspense>
                        </NewLookShell>
                      </NewLookGate>
                    </ProtectedRoute>
                  }
                />
              );
            })}

            {/* 404 route */}
            {routes
              .filter((route) => route.path === '*')
              .map((route) => {
                const Component = route.element;
                return (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <Suspense fallback={<LoadingFallback />}>
                        <Component />
                      </Suspense>
                    }
                  />
                );
              })}
          </Routes>
        </LegacyRedirects>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default AppRouter;
