import { NewLookEmptyPage } from './NewLookShell';

/**
 * The redesigned screens built so far. Each opens inside the New look shell, and only while the shop's
 * New look switch is on (see NewLookGate). Anything not listed here is still the current screen.
 *
 * Add a screen by adding a row: { path, element }. Phase 0 has just the empty page that proves the switch.
 * For now these open for owners only (the access rules for each role arrive with the Roles ticket, P1-8).
 */
export const newLookRoutes = [{ path: '/new-look', element: NewLookEmptyPage }];
