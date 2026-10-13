import React, { forwardRef } from 'react';
import Icon, { Spinner } from './Icon';

/**
 * The one button of the redesign (Part 1, Components).
 *
 *   variant  primary (brand fill), secondary (surface with a line border), danger (red text), ghost (no border)
 *   size     default 40px, till 44px, small 32px
 *   icon     the name of an icon shown before the label (see Icon.jsx)
 *   loading  the spinner replaces the icon and the label stays; the button does nothing while it is loading
 *
 * States: hover, pressed, focus ring (2px brand-text, 2px offset), disabled (track fill, muted text), loading.
 * A button with an icon and no label must be given an aria-label, because the icon alone says nothing to a
 * screen reader.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'default', icon, loading = false, disabled = false, type = 'button', onClick, className = '', children, ...rest },
  ref
) {
  const iconOnly = !children;
  if (process.env.NODE_ENV !== 'production' && iconOnly && !rest['aria-label'] && !rest['aria-labelledby']) {
    // eslint-disable-next-line no-console
    console.error('Button: an icon-only button needs an aria-label.');
  }

  const classes = [
    'nl-btn',
    `nl-btn--${variant}`,
    size === 'till' && 'nl-btn--till',
    size === 'small' && 'nl-btn--small',
    iconOnly && 'nl-btn--icon-only',
    loading && 'is-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (event) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    if (onClick) onClick(event);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children ? <span className="nl-btn__label">{children}</span> : null}
    </button>
  );
});

export default Button;
