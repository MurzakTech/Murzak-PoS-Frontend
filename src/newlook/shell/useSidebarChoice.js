import { useCallback, useState } from 'react';

/**
 * Whether the person collapsed the sidebar to icons. The choice is remembered on this device
 * (Part 1: "The user's collapsed choice is remembered"). It applies from 1024px up; narrower windows decide for
 * themselves. If the device will not store it, the choice still works until the page is closed.
 */
export const SIDEBAR_KEY = 'murzak_new_look:sidebar';

const read = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  } catch (e) {
    return false;
  }
};

export default function useSidebarChoice() {
  const [collapsed, setCollapsed] = useState(read);
  const toggle = useCallback(() => {
    setCollapsed((was) => {
      const next = !was;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'expanded');
      } catch (e) {
        // Not critical; the choice just will not outlast this visit
      }
      return next;
    });
  }, []);
  return [collapsed, toggle];
}
