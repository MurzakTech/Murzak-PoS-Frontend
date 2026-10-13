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
