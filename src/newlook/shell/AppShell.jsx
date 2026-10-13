import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Dialog from '../components/Dialog';
import Drawer from '../components/Drawer';
import Button from '../components/Button';
import S from '../strings';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SearchPalette from './SearchPalette';
import { flatItems } from './navigation';
import useSidebarChoice from './useSidebarChoice';
import useViewportBand, { DRAWER_BELOW } from './useViewportBand';

/**
 * The app shell (Part 1, App shell and navigation): a top bar, a sidebar and a page area. The same on every
 * back-office page; the till is full screen and has its own shell.
 *
 * Sidebar states: 240px; 72px with icons only (chosen by the person from 1024px up, remembered on this device,
 * and forced from 768px to 1023px); and a drawer below 768px, opened from a menu button in the top bar.
 *
 * Keyboard: a "Skip to the page" link is the first stop; Ctrl K (or Command K) and / open search, except while
 * typing in a field or while a dialog is open.
 */
const isTyping = (target) => {
  const tag = target && target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable);
};

const AppShell = ({ navigation, topBar = {}, searchActions = [], children }) => {
  const band = useViewportBand();
  const [choice, toggleChoice] = useSidebarChoice();
  const [drawer, setDrawer] = useState(false);
  const [searching, setSearching] = useState(false);
  const [helping, setHelping] = useState(false);
  const { pathname } = useLocation();

  const collapsed = band === 'medium' || (band === 'wide' && choice);

  // A new page closes the drawer, and so does a window wide enough to show the sidebar in place
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (band !== 'narrow') setDrawer(false);
  }, [band]);

  useEffect(() => {
    const onKey = (event) => {
      const chord = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTyping(event.target);
      if (!chord && !slash) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"]')) return;
      event.preventDefault();
      setSearching(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const items = useMemo(
    () => [
      ...flatItems(navigation)
        .filter((i) => i.to)
        .map((i) => ({ key: `page-${i.key}`, label: i.label, hint: S.shell.shell.hintPage, to: i.to })),
      ...searchActions.map((a, n) => ({ key: `action-${n}-${a.label}`, hint: S.shell.shell.hintAction, ...a })),
    ],
    [navigation, searchActions]
  );

  const sidebar = (props) => <Sidebar navigation={navigation} {...props} />;

  return (
    <div className={['nl-shell', `is-${band}`, collapsed && 'is-collapsed'].filter(Boolean).join(' ')}>
      <a href="#main-content" className="nl-skip">
        {S.shell.shell.skipLink}
      </a>

      <TopBar
        {...topBar}
        showMenuButton={band === 'narrow'}
        onMenu={() => setDrawer(true)}
        onSearch={() => setSearching(true)}
        onHelp={() => setHelping(true)}
      />

      <div className="nl-shell__body">
        {band !== 'narrow' ? (
          <aside className="nl-shell__side">{sidebar({ collapsed, canCollapse: band === 'wide', onToggle: toggleChoice })}</aside>
        ) : null}
        <main id="main-content" tabIndex={-1} className="nl-shell__main">
          <div className="nl-shell__content">{children}</div>
        </main>
      </div>

      <Drawer open={band === 'narrow' && drawer} onClose={() => setDrawer(false)} label={S.shell.nav.mainMenu} closeAtWidth={DRAWER_BELOW}>
        {sidebar({ collapsed: false, label: S.shell.nav.menu, onNavigate: () => setDrawer(false) })}
      </Drawer>

      <SearchPalette open={searching} onClose={() => setSearching(false)} items={items} />

      <Dialog
        open={helping}
        onClose={() => setHelping(false)}
        title={S.shell.help.title}
        description={S.shell.help.description}
        footer={<Button onClick={() => setHelping(false)}>{S.shell.help.done}</Button>}
      >
        <dl className="nl-shortcuts">
          {S.shell.help.shortcuts.map(({ keys, what }) => (
            <div key={keys} className="nl-shortcuts__row">
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </div>
  );
};

export default AppShell;
