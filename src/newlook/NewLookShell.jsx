import React, { createContext, useContext, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import './tokens.css';
import { ToastProvider, useToast } from './components';
import { AppShell, NAVIGATION, PageHeader } from './shell';
import { useThemeMode } from '../theme/ThemeProvider';

/**
 * The shell every redesigned screen sits inside (ticket P1-6): the top bar, the sidebar in its three states and
 * the page area. Every colour, size and space comes from the design tokens.
 *
 * It is plain: the person's name and what Sign out does are passed in (NewLookShellConnected supplies them from
 * the app's sign-in), so it can be shown and tested alone. Pieces whose data belongs to later tickets are not
 * wired yet and stay out of the way: the Till open pill and the store switcher (till and locations, P3-6), the
 * + New menu (P1-7). The component page can switch sample versions of them on to show how they look.
 */
const PREVIEW_DEFAULT = { till: 'unknown', stores: 'one', store: 'main', newMenu: 'hidden' };
const ShellPreviewContext = createContext([PREVIEW_DEFAULT, () => {}]);

/** [preview, setPreview]: sample states of the parts that are not wired yet, for the component page */
export const useShellPreview = () => useContext(ShellPreviewContext);

const SAMPLE_STORES = [
  { id: 'main', name: 'Main shop' },
  { id: 'branch', name: 'Westlands branch' },
];

const Inner = ({ user, onSignOut, children }) => {
  const toast = useToast();
  const { mode, toggleColorMode } = useThemeMode();
  const [preview, setPreview] = useContext(ShellPreviewContext);

  const topBar = useMemo(
    () => ({
      homeTo: NAVIGATION.home.to,
      tillTo: '/sales/pos', // today's till; the redesigned till replaces it (P3)
      till: preview.till === 'open' ? { open: true, since: '08:15' } : preview.till === 'closed' ? { open: false } : undefined,
      onTillPill: () => toast.info('The Till open panel is built with the till (ticket P3-6).'),
      stores: preview.stores === 'two' ? { list: SAMPLE_STORES, currentId: preview.store, onChange: (id) => setPreview({ ...preview, store: id }) } : undefined,
      newItems:
        preview.newMenu === 'sample'
          ? ['Sale', 'Product', 'Customer', 'Expense', 'Purchase'].map((label) => ({ label, onClick: () => toast.info(`New ${label.toLowerCase()} (sample item; the real menu is ticket P1-7)`) }))
          : [],
      theme: mode,
      onToggleTheme: toggleColorMode,
      user,
      userItems: onSignOut ? [{ label: 'Sign out', onClick: onSignOut }] : [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview, mode, user, onSignOut]
  );

  return (
    <AppShell navigation={NAVIGATION} topBar={topBar} searchActions={[]}>
      {children}
    </AppShell>
  );
};

const NewLookShell = ({ user, onSignOut, children }) => {
  const state = useState(PREVIEW_DEFAULT);
  return (
    <ToastProvider>
      <ShellPreviewContext.Provider value={state}>
        <Inner user={user} onSignOut={onSignOut}>
          {children}
        </Inner>
      </ShellPreviewContext.Provider>
    </ToastProvider>
  );
};

/** The page shown inside the shell at /new-look. Replaced by real screens as they are built. */
export const NewLookEmptyPage = () => (
    <div>
      <PageHeader title="New look" subtitle="The New look is on for this shop. No redesigned screens are ready yet; the rest of the app is unchanged." />
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
          Back to the current screens
        </RouterLink>
        <RouterLink to="/new-look/components" style={{ color: 'var(--brand-text)', fontWeight: 'var(--font-weight-semibold)' }}>
          See the components
        </RouterLink>
      </div>
    </div>
);

export default NewLookShell;
