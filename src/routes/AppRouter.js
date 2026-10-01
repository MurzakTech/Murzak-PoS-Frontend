import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { publicRoutes, protectedRoutes, protectedRoutesWithoutLayout, routes } from './routes';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { ErrorBoundary, FullPageLoader, PageSkeleton } from '../components/Common';

// Branded splash for public pages; layout-shaped skeleton inside the app shell
const LoadingFallback = FullPageLoader;
const ContentLoadingFallback = PageSkeleton;

// Recursive function to render nested route children
// Note: Child routes should NOT be wrapped in Layout since they're rendered via <Outlet />
// inside the parent route's Layout
const renderRouteChildren = (children, parentPath) => {
  if (!children || children.length === 0) return null;

  return children.map((childRoute) => {
    const ChildComponent = childRoute.element;
    // Extract the child path relative to parent (e.g., '/sales/new' -> 'new')
    let childPath = childRoute.path.replace(parentPath, '').replace(/^\//, '');
    
    // If child path is empty (index route), use index prop
    if (!childPath) {
      return (
        <Route
          key={childRoute.path}
          index
          element={
            <ProtectedRoute>
              <Suspense fallback={<ContentLoadingFallback />}>
                <ChildComponent />
              </Suspense>
            </ProtectedRoute>
          }
        >
          {childRoute.children && renderRouteChildren(childRoute.children, childRoute.path)}
        </Route>
      );
    }
    
    return (
      <Route
        key={childRoute.path}
        path={childPath}
        element={
          <ProtectedRoute>
            <Suspense fallback={<ContentLoadingFallback />}>
              <ChildComponent />
            </Suspense>
          </ProtectedRoute>
        }
      >
        {childRoute.children && renderRouteChildren(childRoute.children, childRoute.path)}
      </Route>
    );
  });
};

const AppRouter = () => {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
          {/* Public routes (without Layout) */}
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
          
          {/* Redirect old onboarding route to register */}
          <Route
            path="/onboarding"
            element={<Navigate to="/register" replace />}
          />
          
          {/* Protected routes without Layout (e.g., onboarding) */}
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
          
          {/* Protected routes (with Layout) */}
          {protectedRoutes.map((route) => {
            const Component = route.element;
            // Filter out dynamic children (routes with :param) - they'll be rendered as siblings
            const staticChildren = route.children?.filter(
              child => !child.path || (!child.path.includes(':') && !child.path.includes('*'))
            );
            
            return (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<ContentLoadingFallback />}>
                        <Component />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              >
                {staticChildren && staticChildren.length > 0 && renderRouteChildren(staticChildren, route.path)}
              </Route>
            );
          })}
          
          {/* Render dynamic child routes (with :param) as top-level routes */}
          {protectedRoutes
            .filter(route => route.children?.some(child => child.path && child.path.includes(':')))
            .flatMap(route => 
              route.children
                ?.filter(child => child.path && child.path.includes(':'))
                .map(childRoute => {
                  const ChildComponent = childRoute.element;
                  return (
                    <Route
                      key={childRoute.path}
                      path={childRoute.path}
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <Suspense fallback={<ContentLoadingFallback />}>
                              <ChildComponent />
                            </Suspense>
                          </Layout>
                        </ProtectedRoute>
                      }
                    >
                      {childRoute.children && renderRouteChildren(childRoute.children, childRoute.path)}
                    </Route>
                  );
                }) || []
            )}
          
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
    </BrowserRouter>
    </ErrorBoundary>
  );
};

export default AppRouter;

