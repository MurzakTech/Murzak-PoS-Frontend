/**
 * The address of the first-time set-up wizard (ticket P5-4): one real route of its own, not a "being rebuilt" placeholder, and
 * no old address redirects to it (it is a new page, reached from the banner on Home).
 */
import { newLookRoutes } from '../newLookRoutes';
import PagePlaceholder from '../redirects/PagePlaceholder';
import SetupWizard from './SetupWizard';
import { REDIRECTS } from '../redirects/redirectTable';

test('/new-look/setup opens the wizard, once', () => {
  const found = newLookRoutes.filter((r) => r.path === '/new-look/setup');
  expect(found).toHaveLength(1);
  expect(found[0].element).toBe(SetupWizard);
  expect(found[0].element).not.toBe(PagePlaceholder);
});

test('no address is registered twice', () => {
  const paths = newLookRoutes.map((r) => r.path);
  expect(new Set(paths).size).toBe(paths.length);
});

test('no old address is sent to the wizard (the old Register and Onboarding addresses are kept as they are)', () => {
  expect(REDIRECTS.filter((r) => r.to === '/setup')).toEqual([]);
  expect(REDIRECTS.find((r) => r.from === '/register').status).toBe('keep');
});
