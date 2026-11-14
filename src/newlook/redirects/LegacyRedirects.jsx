import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useNewLook } from '../NewLookProvider';
import { LEGACY_KEY, NEW_LOOK_PREFIX, resolveRedirect } from './engine';
import { usePreviewRedirects, isPageLive } from './live';

// Once a person opens a current screen on purpose (an address with legacy=1), the screens they move to from there stay as they are,
// so a button on a current screen (for example New role) does not bounce to the new page. Going back into the New look ends it.
// It lives in memory only, so a reload starts clean.
let stayOnCurrentScreens = false;
export const resetLegacyStay = () => {
  stayOnCurrentScreens = false;
};

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

  const isExplicitLegacy = new URLSearchParams(search).get(LEGACY_KEY) === '1';
  if (isExplicitLegacy) {
    stayOnCurrentScreens = true;
    return children;
  }

  const isLive = (page) => isPageLive(page, preview);
  const hit = resolveRedirect(pathname, search, hash, { isLive });
  const moves = hit && hit.to !== `${pathname}${search}${hash}`;

  // Opening a New look page (the New look now uses the plain addresses, so there is usually no prefix) ends the stay
  if ((NEW_LOOK_PREFIX && pathname.startsWith(NEW_LOOK_PREFIX)) || (!moves && isLive(pathname))) {
    stayOnCurrentScreens = false;
  }

  if (moves) {
    // Reached from a current screen opened on purpose: stay on the current screen instead of bouncing
    if (stayOnCurrentScreens) return children;
    return <Navigate to={hit.to} replace />;
  }
  return children;
};

export default LegacyRedirects;
