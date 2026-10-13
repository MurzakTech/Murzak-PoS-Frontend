import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Menu from '../components/Menu';
import { KEEPOUT_ATTRIBUTE } from '../components/Toast';

/**
 * The top bar (Part 1, App shell and navigation), 64px. From left to right: logo, search (Ctrl K), store switcher
 * (only when the shop has more than one location), the Till open pill, Go to till, + New, theme toggle, help and
 * the user menu.
 *
 * Go to till never wraps (white-space nowrap and a minimum width); below 1100px it keeps its icon and label and
 * the search box shrinks first. Below 1024px, where the sidebar is icons only, the store switcher and + New show
 * only their icons (they keep their names for screen readers) and the pill drops the time, so everything still fits. Below 768px the bar keeps the menu button, search, Go to till and the user menu.
 * The Till open pill and Go to till are marked as places a toast must not cover.
 *
 *   till        { open: boolean, since?: "08:15" }  unknown when left out
 *   tillTo      where Go to till goes
 *   stores      { list: [{ id, name }], currentId, onChange(id) }
 *   newItems    the + New menu: [{ label, icon?, onClick }]
 *   user        { name, email, role? }  role is Owner, Manager or Cashier, shown in the user menu
 *   userItems   [{ label, onClick, icon?, destructive? }] after the line that says who is signed in
 */
const keep = { [KEEPOUT_ATTRIBUTE]: '' };

const TopBar = ({
  homeTo = '/',
  showMenuButton = false,
  onMenu,
  onSearch,
  stores,
  till,
  tillTo,
  onTillPill,
  newItems = [],
  theme = 'light',
  onToggleTheme,
  onHelp,
  user,
  userItems = [],
}) => {
  const tillLabel = till && till.open === false ? 'Open till' : 'Go to till';
  const initial = ((user && (user.name || user.email)) || 'U').trim().charAt(0).toUpperCase();
  const who = (user && (user.name || user.email)) || 'your account';
  const manyStores = stores && stores.list && stores.list.length > 1;
  const currentStore = manyStores ? stores.list.find((s) => s.id === stores.currentId) || stores.list[0] : null;

  return (
    <header className="nl-topbar">
      {showMenuButton ? <Button variant="ghost" icon="menu" aria-label="Open menu" aria-haspopup="dialog" onClick={onMenu} className="nl-topbar__menu" /> : null}

      <Link to={homeTo} className="nl-topbar__logo" aria-label="Murzak POS, go to Home">
        Murzak POS
      </Link>

      <button type="button" className="nl-topbar__search" onClick={onSearch} aria-haspopup="dialog" aria-keyshortcuts="Control+K /" aria-label="Search">
        <Icon name="search" />
        <span className="nl-topbar__search-text">Search</span>
        <kbd className="nl-topbar__kbd" aria-hidden="true">
          Ctrl K
        </kbd>
      </button>

      <div className="nl-topbar__spacer" />

      {manyStores ? (
        <div className="nl-topbar__optional">
          <Menu label={`Store: ${currentStore.name}. Change store`} variant="secondary" size="default" icon="store" className="nl-topbar__collapsible" items={stores.list.map((s) => ({ label: s.name, selected: s.id === currentStore.id, onClick: () => stores.onChange && stores.onChange(s.id) }))}>
            {currentStore.name}
          </Menu>
        </div>
      ) : null}

      {till && till.open ? (
        <button type="button" className="nl-pill nl-topbar__optional" aria-haspopup="dialog" onClick={onTillPill} {...keep}>
          <Icon name="clock" />
          <span>
            Till open<span className="nl-pill__since">{till.since ? ` since ${till.since}` : ''}</span>
          </span>
        </button>
      ) : null}

      <Button as={Link} to={tillTo || '/'} icon="till" className="nl-topbar__till" {...keep}>
        {tillLabel}
      </Button>

      {newItems.length ? (
        <div className="nl-topbar__optional">
          <Menu label="New" variant="secondary" size="default" icon="plus" className="nl-topbar__collapsible" items={newItems}>
            New
          </Menu>
        </div>
      ) : null}

      <div className="nl-topbar__optional nl-topbar__tools">
        <Button variant="ghost" icon={theme === 'dark' ? 'sun' : 'moon'} aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'} onClick={onToggleTheme} />
        <Button variant="ghost" icon="help" aria-label="Help and shortcuts" aria-haspopup="dialog" onClick={onHelp} />
      </div>

      <Menu label={`Account menu for ${who}`} variant="ghost" size="default" className="nl-topbar__avatar" items={[{ label: `Signed in as ${who}${user && user.role ? `, ${user.role}` : ''}`, disabled: true }, ...userItems]}>
        {initial}
      </Menu>
    </header>
  );
};

export default TopBar;
