import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useNewLook } from '../NewLookProvider';
import { resolveRedirect } from './engine';
import { usePreviewRedirects, isPageLive } from './live';

/**
 * Wraps the app's routes. When the shop's New look is on and the person opens an old address whose new page is
 * live, they are sent to the new page (and the old address leaves the browser's history, so Back does not
 * bounce). With the switch off, nothing here does anything: every old address works as it always did.
 */
const LegacyRedirects = ({ children }) => {
  const { enabled } = useNewLook();
  const { pathname, search, hash } = useLocation();
  const preview = usePreviewRedirects();

  if (!enabled) return children;
  const hit = resolveRedirect(pathname, search, hash, { isLive: (page) => isPageLive(page, preview) });
  if (hit && hit.to !== `${pathname}${search}${hash}`) return <Navigate to={hit.to} replace />;
  return children;
};

export default LegacyRedirects;
