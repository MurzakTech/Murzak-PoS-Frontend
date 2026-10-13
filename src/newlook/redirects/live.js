import { useSyncExternalStore } from 'react';

/**
 * Which redesigned pages are real, and the owner's "preview the redirects" switch.
 *
 * A redirect from an old address to a new page is switched on only when the new page is a finished screen
 * (BUILT_PAGES), so turning the New look on never takes anyone from a working screen to an empty one. Each
 * ticket that finishes a page adds its address here, in the same change. Until then the old screen keeps
 * working at its old address and the sidebar keeps opening it.
 *
 * The preview switch lets the owner see every redirect working now: with it on, every old address redirects to
 * its new page, and a page that is not finished yet shows a "being rebuilt" notice with a way back to the
 * current screen. It is stored on this device only and never changes anything for other people.
 */
export const BUILT_PAGES = [];
export const PREVIEW_KEY = 'murzak_new_look:preview-redirects';

const listeners = new Set();
const read = () => {
  try {
    return localStorage.getItem(PREVIEW_KEY) === '1';
  } catch (e) {
    return false;
  }
};
let preview = read();

export const getPreview = () => preview;
export const setPreview = (on) => {
  preview = Boolean(on);
  try {
    localStorage.setItem(PREVIEW_KEY, preview ? '1' : '0');
  } catch (e) {
    // Not critical; the choice just lasts until the page closes
  }
  listeners.forEach((l) => l());
};
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
/** Re-reads the stored choice (used by tests, and when another tab changes it) */
export const resyncPreview = () => {
  preview = read();
  listeners.forEach((l) => l());
};

export const usePreviewRedirects = () => useSyncExternalStore(subscribe, getPreview, () => false);

/** Is this new page a finished screen, or is the preview on? `path` is the unprefixed address, such as '/sales'. */
export const isPageLive = (path, previewOn = preview, built = BUILT_PAGES) => previewOn || built.includes(path.split('?')[0]);
