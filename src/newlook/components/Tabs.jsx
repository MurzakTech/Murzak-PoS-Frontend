import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from './Chip';

/**
 * Tabs (Part 1, Components): the sub-pages inside a page, such as All sales, Unpaid, Returns, Till sessions.
 * The selected tab has brand-text and a 2px underline, and an optional count chip. **A tab is part of the
 * address**: each one is a real link, so a link, a refresh or the Back button opens the same tab.
 *
 *   tabs   [{ key, label, to, count? }]   `to` is the address of the tab, for example "/sales/unpaid"
 *   value  the key of the tab that is open
 *
 * Keyboard: the Left and Right arrow keys move to the previous and next tab and open it; Home and End jump.
 */
const Tabs = ({ tabs, value, label, className = '' }) => {
  const navigate = useNavigate();
  const refs = useRef([]);
  const selected = Math.max(0, tabs.findIndex((t) => t.key === value));

  const go = (index) => {
    const i = (index + tabs.length) % tabs.length;
    navigate(tabs[i].to);
    if (refs.current[i]) refs.current[i].focus();
  };

  const onKeyDown = (event, index) => {
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      go(moves[event.key]);
    }
  };

  return (
    <div role="tablist" aria-label={label} className={`nl-tabs ${className}`.trim()}>
      {tabs.map((tab, i) => {
        const on = i === selected;
        return (
          <Link
            key={tab.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            to={tab.to}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={['nl-tab', on && 'is-selected'].filter(Boolean).join(' ')}
            onKeyDown={(event) => onKeyDown(event, i)}
          >
            <span className="nl-tab__label" data-label={tab.label}>
              {tab.label}
            </span>
            {tab.count !== undefined && tab.count !== null ? <Badge count={tab.count} label="items" /> : null}
          </Link>
        );
      })}
    </div>
  );
};

export default Tabs;
