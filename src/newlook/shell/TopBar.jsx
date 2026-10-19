import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Menu from '../components/Menu';
import { KEEPOUT_ATTRIBUTE } from '../components/Toast';
import { useBrand } from '../brand/BrandProvider';
import { productImageUrl } from '../../utils/productArt';
import S from '../strings';
import fill from '../labels/fill';

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
const T = S.shell.topBar;

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
  // The shop's own logo replaces the product name when the owner has set one (Settings, Brand); otherwise the name is shown
  const { brand } = useBrand();
  const shopLogo = brand.logo ? productImageUrl({ image: brand.logo }) : null;
  const tillLabel = till && till.open === false ? T.openTill : T.goToTill;
  const initial = ((user && (user.name || user.email)) || T.fallbackInitial).trim().charAt(0).toUpperCase();
  const who = (user && (user.name || user.email)) || T.fallbackWho;
  const manyStores = stores && stores.list && stores.list.length > 1;
  const currentStore = manyStores ? stores.list.find((s) => s.id === stores.currentId) || stores.list[0] : null;

  return (
    <header className="nl-topbar">
      {showMenuButton ? <Button variant="ghost" icon="menu" aria-label={T.openMenu} aria-haspopup="dialog" onClick={onMenu} className="nl-topbar__menu" /> : null}

      <Link to={homeTo} className="nl-topbar__logo" aria-label={fill(T.logoLabel, { site: S.shell.shell.siteName })}>
        {shopLogo ? <img src={shopLogo} alt="" className="nl-topbar__logo-image" /> : S.shell.shell.siteName}
      </Link>

      <button type="button" className="nl-topbar__search" onClick={onSearch} aria-haspopup="dialog" aria-keyshortcuts="Control+K /" aria-label={T.search}>
        <Icon name="search" />
        <span className="nl-topbar__search-text">{T.search}</span>
        <kbd className="nl-topbar__kbd" aria-hidden="true">
          {T.searchShortcut}
        </kbd>
      </button>

      <div className="nl-topbar__spacer" />

      {manyStores ? (
        <div className="nl-topbar__optional">
          <Menu label={fill(T.storeMenu, { name: currentStore.name })} variant="secondary" size="default" icon="store" className="nl-topbar__collapsible" items={stores.list.map((s) => ({ label: s.name, selected: s.id === currentStore.id, onClick: () => stores.onChange && stores.onChange(s.id) }))}>
            {currentStore.name}
          </Menu>
        </div>
      ) : null}

      {till && till.open ? (
        <button type="button" className="nl-pill nl-topbar__optional" aria-haspopup="dialog" onClick={onTillPill} {...keep}>
          <Icon name="clock" />
          <span>
            {T.tillOpen}
            <span className="nl-pill__since">{till.since ? <>{' '}{fill(T.tillSince, { time: till.since })}</> : ''}</span>
          </span>
        </button>
      ) : null}

      <Button as={Link} to={tillTo || '/'} icon="till" className="nl-topbar__till" {...keep}>
        {tillLabel}
      </Button>

      {newItems.length ? (
        <div className="nl-topbar__optional">
          <Menu label={T.new} variant="secondary" size="default" icon="plus" className="nl-topbar__collapsible" items={newItems}>
            {T.new}
          </Menu>
        </div>
      ) : null}

      <div className="nl-topbar__optional nl-topbar__tools">
        <Button variant="ghost" icon={theme === 'dark' ? 'sun' : 'moon'} aria-label={theme === 'dark' ? T.switchToLight : T.switchToDark} onClick={onToggleTheme} />
        <Button variant="ghost" icon="help" aria-label={T.help} aria-haspopup="dialog" onClick={onHelp} />
      </div>

      <Menu label={fill(T.accountMenu, { who })} variant="ghost" size="default" className="nl-topbar__avatar" items={[{ label: user && user.role ? fill(T.signedInRole, { who, role: user.role }) : fill(T.signedIn, { who }), disabled: true }, ...userItems]}>
        {initial}
      </Menu>
    </header>
  );
};

export default TopBar;
