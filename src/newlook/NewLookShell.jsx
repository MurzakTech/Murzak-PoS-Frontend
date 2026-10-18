import React, { createContext, useContext, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import './tokens.css';
import { ToastProvider, useToast } from './components';
import { AppShell, NAVIGATION, PageHeader, resolveNavigation } from './shell';
import { newMenuItems, searchActionsFor } from './shell/newMenu';
import { isPageLive, usePreviewRedirects } from './redirects/live';
import { toNewAddress } from './redirects/engine';
import { useThemeMode } from '../theme/ThemeProvider';
import LanguageDialog from './shell/LanguageDialog';
import LT from './shell/strings.language';
import S from './strings';

/**
 * The shell every redesigned screen sits inside (ticket P1-6): the top bar, the sidebar in its three states and
 * the page area. Every colour, size and space comes from the design tokens.
 *
 * It is plain: the person's name and what Sign out does are passed in (NewLookShellConnected supplies them from
 * the app's sign-in), so it can be shown and tested alone. Pieces whose data belongs to later tickets are not
 * wired yet and stay out of the way: the Till open pill and the store switcher (till and locations, P3-6). The component page can switch sample versions of them on to show how they look.
 */
const PREVIEW_DEFAULT = { till: 'unknown', stores: 'one', store: 'main', newMenu: 'role' };
const ShellPreviewContext = createContext([PREVIEW_DEFAULT, () => {}]);

/** [preview, setPreview]: sample states of the parts that are not wired yet, for the component page */
export const useShellPreview = () => useContext(ShellPreviewContext);

const SAMPLE_STORES = [
  { id: 'main', name: S.shell.newLookShell.sampleMainShop },
  { id: 'branch', name: S.shell.newLookShell.sampleBranch },
];

const Inner = ({ user, onSignOut, hasAccess, children }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const previewRedirects = usePreviewRedirects();
  const { mode, toggleColorMode } = useThemeMode();
  const [preview, setPreview] = useContext(ShellPreviewContext);
  const [languageOpen, setLanguageOpen] = useState(false);

  // Where each menu item goes now: the new page once it is live, otherwise the current screen (see redirects/live.js)
  const open = (address) => address && navigate(address);
  const destination = (item) => (isPageLive(item.page, previewRedirects) ? toNewAddress(item.page) : item.old);
  const navigation = useMemo(
    () => resolveNavigation(NAVIGATION, { isLive: (page) => isPageLive(page, previewRedirects), toNew: toNewAddress }),
    [previewRedirects]
  );
  const searchActions = useMemo(
    () => searchActionsFor({ hasAccess, open: (a) => navigate(a), destination }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasAccess, previewRedirects]
  );

  const topBar = useMemo(
    () => ({
      homeTo: navigation.home.to,
      tillTo: isPageLive('/till', previewRedirects) ? toNewAddress('/till') : '/sales/pos', // today's till until the redesigned one exists (P3)
      till: preview.till === 'open' ? { open: true, since: '08:15' } : preview.till === 'closed' ? { open: false } : undefined,
      onTillPill: () => toast.info(S.shell.newLookShell.tillPanelNotice),
      stores: preview.stores === 'two' ? { list: SAMPLE_STORES, currentId: preview.store, onChange: (id) => setPreview({ ...preview, store: id }) } : undefined,
      newItems: newMenuItems({ hasAccess, open, destination, showAll: preview.newMenu === 'all' }),
      theme: mode,
      onToggleTheme: toggleColorMode,
      user,
      userItems: [{ label: LT.menu, onClick: () => setLanguageOpen(true) }, ...(onSignOut ? [{ label: S.shell.newLookShell.signOut, onClick: onSignOut }] : [])],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview, mode, user, onSignOut, hasAccess, previewRedirects, navigation]
  );

  return (
    <AppShell navigation={navigation} topBar={topBar} searchActions={searchActions}>
      {children}
      <LanguageDialog open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </AppShell>
  );
};

const NewLookShell = ({ user, onSignOut, hasAccess = () => true, children }) => {
  const state = useState(PREVIEW_DEFAULT);
  return (
    <ToastProvider>
      <ShellPreviewContext.Provider value={state}>
        <Inner user={user} onSignOut={onSignOut} hasAccess={hasAccess}>
          {children}
        </Inner>
      </ShellPreviewContext.Provider>
    </ToastProvider>
  );
};

/** The page shown inside the shell at /new-look. Replaced by real screens as they are built. */
export const NewLookEmptyPage = () => (
    <div>
      <PageHeader title={S.shell.newLookShell.emptyTitle} subtitle={S.shell.newLookShell.emptySubtitle} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
        <RouterLink
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 'var(--control-height)',
            padding: '0 var(--space-4)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: 'var(--card-border)',
            borderRadius: 'var(--radius-button)',
            fontWeight: 'var(--font-weight-semibold)',
            textDecoration: 'none',
          }}
        >
          {S.shell.newLookShell.backToCurrent}
        </RouterLink>
        <RouterLink to="/new-look/components" style={{ color: 'var(--brand-text)', fontWeight: 'var(--font-weight-semibold)' }}>
          {S.shell.newLookShell.seeComponents}
        </RouterLink>
      </div>
    </div>
);

export default NewLookShell;
