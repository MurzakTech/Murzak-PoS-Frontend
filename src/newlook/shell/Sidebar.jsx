import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { isActive } from './navigation';

/**
 * The sidebar (Part 1, App shell and navigation). Three states, chosen by the shell:
 *   expanded   240px, icon and words, with the group names
 *   collapsed  72px, icons only; each item keeps its name for screen readers and shows it on hover and focus
 *   in the drawer (below 768px): the expanded layout, shown by the Drawer component
 * It is fixed in place and scrolls by itself, so it never scrolls away on a long form. The page the person is on
 * has aria-current="page" and the soft fill with brand-text; the fill is never the only sign.
 */
const Item = ({ item, collapsed, pathname, onNavigate }) => {
  const active = isActive(item, pathname);
  const body = (
    <>
      <Icon name={item.icon} />
      <span className={collapsed ? 'nl-visually-hidden' : 'nl-nav__label'}>{item.label}</span>
      {item.soon && !collapsed ? <span className="nl-nav__soon">Soon</span> : null}
    </>
  );
  const common = { className: ['nl-nav__item', active && 'is-active', item.soon && 'is-soon'].filter(Boolean).join(' '), 'data-tooltip': collapsed ? item.label : undefined };

  if (item.soon || !item.to) {
    return (
      <span {...common} aria-disabled="true" title={collapsed ? `${item.label} (coming soon)` : undefined}>
        {body}
        {collapsed ? <span className="nl-visually-hidden"> (coming soon)</span> : null}
      </span>
    );
  }
  return (
    <Link to={item.to} {...common} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
      {body}
    </Link>
  );
};

const Sidebar = ({ navigation, collapsed = false, onToggle, canCollapse = false, onNavigate, label = 'Main menu', className = '' }) => {
  const { pathname } = useLocation();
  const props = { collapsed, pathname, onNavigate };

  // With icons only, an item's name shows beside it on hover and on keyboard focus. It is drawn by the sidebar,
  // outside the scrolling list, so the list cannot clip it; Escape hides it.
  const [tip, setTip] = useState(null);
  const show = (event) => {
    const el = event.target.closest && event.target.closest('[data-tooltip]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    // beside the sidebar's edge, not the icon's, so the name never sits on the border
    const edge = event.currentTarget.getBoundingClientRect().right;
    setTip({ label: el.getAttribute('data-tooltip'), top: r.top + r.height / 2, left: edge + 8 });
  };
  const hide = () => setTip(null);

  return (
    <nav
      aria-label={label}
      className={['nl-sidebar', collapsed && 'is-collapsed', className].filter(Boolean).join(' ')}
      onMouseOver={show}
      onFocus={show}
      onMouseOut={hide}
      onBlur={hide}
      onKeyDown={(event) => event.key === 'Escape' && hide()}
    >
      {collapsed && tip ? (
        <div className="nl-tooltip" aria-hidden="true" style={{ top: tip.top, left: tip.left }}>
          {tip.label}
        </div>
      ) : null}
      <div className="nl-sidebar__scroll">
        <ul className="nl-nav__list">
          <li>
            <Item item={navigation.home} {...props} />
          </li>
        </ul>
        {navigation.groups.map((group) => (
          <div role="group" aria-labelledby={`nl-nav-group-${group.key}`} className="nl-nav__group" key={group.key}>
            <p id={`nl-nav-group-${group.key}`} className={collapsed ? 'nl-visually-hidden' : 'nl-nav__heading'}>
              {group.label}
            </p>
            <ul className="nl-nav__list">
              {group.items.map((item) => (
                <li key={item.key}>
                  <Item item={item} {...props} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="nl-sidebar__foot">
        <ul className="nl-nav__list">
          <li>
            <Item item={navigation.settings} {...props} />
          </li>
        </ul>
        {canCollapse ? (
          <button type="button" className="nl-nav__item nl-nav__toggle" aria-pressed={collapsed} onClick={onToggle} data-tooltip={collapsed ? 'Expand menu' : undefined}>
            <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} />
            <span className={collapsed ? 'nl-visually-hidden' : 'nl-nav__label'}>{collapsed ? 'Expand menu' : 'Collapse menu'}</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
};

export default Sidebar;
