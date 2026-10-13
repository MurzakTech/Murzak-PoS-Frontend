import { NewLookEmptyPage } from './NewLookShell';
import ComponentPage from './ComponentPage';

/**
 * The redesigned screens built so far. Each opens inside the New look shell, and only while the shop's
 * New look switch is on (see NewLookGate). Anything not listed here is still the current screen.
 *
 * Add a screen by adding a row: { path, element }. For now these open for owners only (the access rules for
 * each role arrive with the Roles ticket, P1-8).
 */
export const newLookRoutes = [
  { path: '/new-look', element: NewLookEmptyPage },
  // Every shared component in every state, in both themes (the Phase 1 gate)
  { path: '/new-look/components', element: ComponentPage },
];
