import React from 'react';

/**
 * The icons of the redesign: 18px, 1.8px stroke, round ends, the current text colour (Part 1, Icons).
 * Size and stroke come from the tokens (--icon-size, --icon-stroke), set in components.css.
 * An icon is decoration: the words beside it carry the meaning, so it is hidden from screen readers.
 */
const SHAPES = {
  check: <path d="M3.5 9.5l3.5 3.5 7.5-8" />,
  clock: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M9 5.5V9l2.5 1.5" />
    </>
  ),
  alert: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M9 5.5v4" />
      <path d="M9 12.4v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M9 8.2V12" />
      <path d="M9 5.6v.1" />
    </>
  ),
  // A return: an arrow that comes back, for "Part returned"
  undo: (
    <>
      <path d="M5.5 4.5L3 7l2.5 2.5" />
      <path d="M3 7h7.5a3.5 3.5 0 0 1 0 7H8" />
    </>
  ),
  arrowUp: <path d="M9 14.5v-11M4.5 8L9 3.5 13.5 8" />,
  arrowDown: <path d="M9 3.5v11M4.5 10L9 14.5 13.5 10" />,
  chevronDown: <path d="M4.5 7l4.5 4.5L13.5 7" />,
  x: <path d="M5 5l8 8M13 5l-8 8" />,
  plus: <path d="M9 4v10M4 9h10" />,
  search: (
    <>
      <circle cx="8" cy="8" r="4.8" />
      <path d="M11.6 11.6L15 15" />
    </>
  ),
  inbox: (
    <>
      <path d="M2.5 10.5h4l1 2h3l1-2h4" />
      <path d="M2.5 10.5l1.8-6h9.4l1.8 6V14a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-3.5z" />
    </>
  ),
  more: (
    <>
      <circle cx="9" cy="3.8" r="0.9" />
      <circle cx="9" cy="9" r="0.9" />
      <circle cx="9" cy="14.2" r="0.9" />
    </>
  ),
  menu: <path d="M3 5h12M3 9h12M3 13h12" />,
  home: <path d="M3 8.5L9 3.5l6 5V15a.5.5 0 0 1-.5.5H11v-4H7v4H3.5A.5.5 0 0 1 3 15V8.5z" />,
  calendar: (
    <>
      <rect x="3" y="4" width="12" height="11" rx="1.5" />
      <path d="M3 7.5h12M6 2.5v3M12 2.5v3" />
    </>
  ),
  receipt: (
    <>
      <path d="M4.5 2.5h9v13l-2-1.3-2.5 1.3-2.5-1.3-2 1.3v-13z" />
      <path d="M7 6.5h4M7 9.5h4" />
    </>
  ),
  users: (
    <>
      <circle cx="7" cy="6.5" r="2.5" />
      <path d="M2.5 15c0-2.6 2-4.3 4.5-4.3s4.5 1.7 4.5 4.3" />
      <path d="M12 4.3a2.3 2.3 0 0 1 0 4.4M13.5 10.9c1.2.5 2 1.7 2 4.1" />
    </>
  ),
  box: (
    <>
      <path d="M9 2.5l6 3v7l-6 3-6-3v-7l6-3z" />
      <path d="M3 5.5l6 3 6-3M9 8.5v7" />
    </>
  ),
  layers: (
    <>
      <path d="M9 2.5l6.5 3.2L9 9 2.5 5.7 9 2.5z" />
      <path d="M2.5 9l6.5 3.2L15.5 9M2.5 12.3L9 15.5l6.5-3.2" />
    </>
  ),
  truck: (
    <>
      <path d="M2 4.5h8.5V12H2z" />
      <path d="M10.5 7.5h2.8l2.2 2.6V12h-5z" />
      <circle cx="5" cy="13.2" r="1.3" />
      <circle cx="12.5" cy="13.2" r="1.3" />
    </>
  ),
  store: (
    <>
      <path d="M3.2 7.5l1-4h9.6l1 4" />
      <path d="M3.2 7.5a2 2 0 0 0 3.9 0 2 2 0 0 0 3.8 0 2 2 0 0 0 3.9 0" />
      <path d="M4 9.7V15h10V9.7" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 5.5h11a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.5z" />
      <path d="M3 5.5L12 3v2.5" />
      <path d="M11.5 10.2v.1" />
    </>
  ),
  chart: <path d="M3 15h12M5.5 12V9.5M9 12V5M12.5 12V7.5" />,
  settings: (
    <>
      <path d="M3 5.5h6.5M13.5 5.5H15M3 12.5h2M8.5 12.5H15" />
      <circle cx="11.5" cy="5.5" r="1.6" />
      <circle cx="6.5" cy="12.5" r="1.6" />
    </>
  ),
  till: (
    <>
      <rect x="3" y="3" width="12" height="12" rx="2" />
      <path d="M3 7h12M6.5 10.2v.1M9 10.2v.1M11.5 10.2v.1M6.5 12.6v.1M9 12.6v.1M11.5 12.6v.1" />
    </>
  ),
  help: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M7.2 7.3a1.9 1.9 0 1 1 2.6 1.7c-.5.3-.8.7-.8 1.3M9 12.7v.1" />
    </>
  ),
  sun: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4.1 4.1l1 1M12.9 12.9l1 1M13.9 4.1l-1 1M5.1 12.9l-1 1" />
    </>
  ),
  moon: <path d="M14.5 10.5A6 6 0 0 1 7.5 3.5a6 6 0 1 0 7 7z" />,
  chevronsLeft: <path d="M10.5 4.5L6 9l4.5 4.5M14.5 4.5L10 9l4.5 4.5" />,
  chevronsRight: <path d="M7.5 4.5L12 9l-4.5 4.5M3.5 4.5L8 9l-4.5 4.5" />,
  user: (
    <>
      <circle cx="9" cy="6.5" r="2.8" />
      <path d="M3.5 15c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
    </>
  ),
  chevronLeft: <path d="M11 4.5L6.5 9l4.5 4.5" />,
  chevronRight: <path d="M7 4.5L11.5 9 7 13.5" />,
};

export const ICON_NAMES = Object.keys(SHAPES);

const Icon = ({ name, className = '' }) => (
  <svg
    className={`nl-icon ${className}`.trim()}
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    data-icon={name}
  >
    {SHAPES[name] || null}
  </svg>
);

/** The loading spinner a button shows in place of its icon. Static (no spin) when the device asks for reduced motion. */
export const Spinner = () => (
  <svg className="nl-icon nl-spinner" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true" focusable="false" data-icon="spinner">
    <circle cx="9" cy="9" r="6.5" strokeDasharray="30 12" />
  </svg>
);

export default Icon;
