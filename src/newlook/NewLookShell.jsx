import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import './tokens.css';

/**
 * The shell every redesigned screen will sit inside: a top bar, a menu column and a page area.
 *
 * It is EMPTY on purpose. Ticket P0-5 proved the switch; this is its first use of the design tokens
 * (P1-1): every colour, size, radius and space below comes from tokens.css, none is written here. The real
 * top bar, menu and page header are built in P1-6 from the shared components (P1-3 to P1-5).
 */
const shell = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg)',
  color: 'var(--ink)',
  fontFamily: 'var(--font-family)',
  fontSize: 'var(--body-size)',
  lineHeight: 'var(--body-line)',
  fontVariantNumeric: 'tabular-nums',
};

const topBar = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: '0 var(--page-gutter)',
  height: 64,
  background: 'var(--surface)',
  borderBottom: 'var(--card-border)',
};

const chip = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 'var(--control-height-small)',
  padding: '0 var(--space-3)',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--soft)',
  color: 'var(--brand-text)',
  fontWeight: 'var(--font-weight-semibold)',
  fontSize: 'var(--caption-size)',
};

const NewLookShell = ({ children }) => (
  <div style={shell}>
    <header style={topBar}>
      <span style={{ fontWeight: 'var(--font-weight-bold)' }}>Murzak POS</span>
      <span style={chip}>New look</span>
    </header>

    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <nav
        aria-label="Main menu"
        className="newlook-menu"
        style={{ width: 240, flexShrink: 0, background: 'var(--surface)', borderRight: 'var(--card-border)' }}
      />
      <main style={{ flex: 1, minWidth: 0, padding: 'var(--page-gutter)' }}>{children}</main>
    </div>
    {/* The menu column hides below 768px, where the real shell uses a drawer (P1-6) */}
    <style>{'@media (max-width: 767px) { .newlook-menu { display: none; } }'}</style>
  </div>
);

/** The page shown inside the empty shell. Replaced by real screens as they are built. */
export const NewLookEmptyPage = () => (
  <div>
    <h1
      style={{
        margin: '0 0 var(--space-1)',
        fontSize: 'var(--page-title-size)',
        fontWeight: 'var(--page-title-weight)',
        letterSpacing: 'var(--page-title-spacing)',
      }}
    >
      New look
    </h1>
    <p style={{ margin: '0 0 var(--space-6)', color: 'var(--muted)', fontSize: 'var(--body-size)' }}>
      The New look is on for this shop. No redesigned screens are ready yet; the rest of the app is unchanged.
    </p>
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
    </RouterLink>{' '}
    <RouterLink to="/new-look/components" style={{ marginLeft: 'var(--space-3)', color: 'var(--brand-text)', fontWeight: 'var(--font-weight-semibold)' }}>
      See the components
    </RouterLink>
  </div>
);

export default NewLookShell;
