import React, { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../components/Dialog';
import Field from '../components/Field';

/**
 * Search (Part 1, Components): one search box in the top bar, opened with Ctrl K or /. It finds pages and actions
 * such as "add product". Records (a customer, a receipt) need the server and arrive with the screens that own them.
 * Recent searches show when the box is empty; "Nothing matches" comes with a suggestion.
 *
 *   items   [{ key, label, hint, to?, onSelect?, keywords? }]   hint is "Page" or "Action"
 *
 * It is a combobox: the arrow keys move through the results, Enter opens one, Escape closes. The recent list is
 * kept on this device only.
 */
export const RECENT_KEY = 'murzak_new_look:recent-search';
export const MAX_RECENT = 5;

const readRecent = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string').slice(0, MAX_RECENT) : [];
  } catch (e) {
    return [];
  }
};
const writeRecent = (keys) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(keys.slice(0, MAX_RECENT)));
  } catch (e) {
    // Not critical
  }
};

export const search = (items, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = items
    .map((item) => {
      const label = item.label.toLowerCase();
      const words = `${label} ${(item.keywords || '').toLowerCase()}`;
      if (label.startsWith(q)) return { item, rank: 0 };
      if (label.split(/\s+/).some((w) => w.startsWith(q))) return { item, rank: 1 };
      if (words.includes(q)) return { item, rank: 2 };
      return null;
    })
    .filter(Boolean);
  return scored.sort((a, b) => a.rank - b.rank).map((s) => s.item);
};

const SearchPalette = ({ open, onClose, items }) => {
  const navigate = useNavigate();
  const base = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState(readRecent);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setRecent(readRecent());
    }
  }, [open]);

  const results = useMemo(() => {
    if (query.trim()) return search(items, query);
    return recent.map((key) => items.find((i) => i.key === key)).filter(Boolean);
  }, [items, query, recent]);

  useEffect(() => setActive(0), [query]);

  const choose = (item) => {
    writeRecent([item.key, ...readRecent().filter((k) => k !== item.key)]);
    onClose();
    if (item.onSelect) item.onSelect();
    else if (item.to) navigate(item.to);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  };

  const typed = query.trim();
  const listId = `${base}-results`;
  return (
    <Dialog open={open} onClose={onClose} title="Search" className="nl-search">
      <Field
        label="Search"
        icon="search"
        placeholder="Pages and actions"
        value={query}
        onChange={setQuery}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-activedescendant={results[active] ? `${base}-${results[active].key}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        data-autofocus=""
      />

      {!typed && results.length > 0 ? <p className="nl-search__heading">Recent searches</p> : null}
      {results.length > 0 ? (
        <ul id={listId} role="listbox" aria-label={typed ? 'Results' : 'Recent searches'} className="nl-search__list">
          {results.map((item, i) => (
            <li
              key={item.key}
              id={`${base}-${item.key}`}
              role="option"
              aria-selected={i === active}
              className={['nl-search__item', i === active && 'is-active'].filter(Boolean).join(' ')}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
            >
              <span>{item.label}</span>
              <span className="nl-search__hint">{item.hint}</span>
            </li>
          ))}
        </ul>
      ) : typed ? (
        <div role="status" className="nl-search__empty">
          <p className="nl-search__empty-title">Nothing matches &ldquo;{typed}&rdquo;</p>
          <p className="nl-search__empty-text">Try a page name such as Sales or Products, or an action such as add product.</p>
        </div>
      ) : (
        <p className="nl-search__empty-text">Type a page or an action, such as Sales or add product.</p>
      )}
    </Dialog>
  );
};

export default SearchPalette;
