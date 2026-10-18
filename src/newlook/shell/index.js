/** The app shell of the redesign (ticket P1-6). Built from the shared components in ../components. */
import '../components';
import './shell.css';

export { default as AppShell } from './AppShell';
export { default as TopBar } from './TopBar';
export { default as Sidebar } from './Sidebar';
export { default as PageHeader, MAX_HEADER_ACTIONS, SITE_NAME } from './PageHeader';
export { default as SearchPalette, search, RECENT_KEY, MAX_RECENT } from './SearchPalette';
export { NAVIGATION, flatItems, isActive, resolveNavigation } from './navigation';
export { NEW_MENU, newMenuItems, searchActionsFor } from './newMenu';
export { default as useViewportBand, bandFor, DRAWER_BELOW, ICONS_BELOW } from './useViewportBand';
export { default as useSidebarChoice, SIDEBAR_KEY } from './useSidebarChoice';
