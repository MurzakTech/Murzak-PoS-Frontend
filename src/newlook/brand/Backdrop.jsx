import React from 'react';
import { photoUrl } from '../../assets/photos';
import { BACKDROPS, DEFAULT_BACKDROP } from './brandModel';
import './backdrop.css';

/**
 * The shop's chosen background (Settings, Brand): a quiet layer behind the sign-in page and the Home banner. The patterns are drawn in
 * CSS from the shop's accent colour, mixed down to a tint, so they follow the colour chosen and the dark theme. "Market scene" uses a
 * photo from the self-hosted library (src/assets/photos), faded behind a veil of the page colour so the words on top stay easy to read.
 * "Plain" draws nothing. It is only decoration (aria-hidden) and never sits behind the till.
 *
 *   name   one of BACKDROPS; anything else falls back to the default
 */
const PHOTO = 'industry-grocery';

const Backdrop = ({ name = DEFAULT_BACKDROP, className = '' }) => {
  const style = BACKDROPS.includes(name) ? name : DEFAULT_BACKDROP;
  if (style === 'plain') return null;
  const photo = style === 'market' ? photoUrl(PHOTO) : null;
  return <div className={['nl-bd', `nl-bd--${style}`, className].filter(Boolean).join(' ')} style={photo ? { backgroundImage: `url(${photo})` } : undefined} aria-hidden="true" />;
};

export default Backdrop;
