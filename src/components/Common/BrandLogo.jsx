import React from 'react';
import logoMark from '../../assets/logo_mark.png';

/**
 * Murzak POS logo: the transparent brand mark plus an optional wordmark.
 * Works on light and dark backgrounds (the mark has no background of its own).
 */
const BrandLogo = ({ size = 32, showText = true, className = '', style }) => (
  <div
    className={`nl-brand-logo ${className}`.trim()}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      ...style,
    }}
  >
    <img
      src={logoMark}
      alt={showText ? '' : 'Murzak POS'}
      style={{
        height: size,
        width: 'auto',
        display: 'block',
        flexShrink: 0,
      }}
    />
    {showText && (
      <span
        style={{
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          fontSize: 'var(--card-title-size)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        Murzak <span style={{ color: 'var(--brand-text)' }}>POS</span>
      </span>
    )}
  </div>
);

export default BrandLogo;
