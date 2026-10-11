import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { photoUrl } from '../../assets/photos';

/**
 * A picture from the self-hosted photo library, by name.
 *
 * If that photo has not been added (or fails to load) the `fallback` is shown
 * instead, or nothing at all, so a page never shows a broken-image icon.
 *
 * ratio    shape of the frame, as width / height (4 / 5, 3 / 2 ...)
 * position which part stays in view when the frame crops the picture
 *          (CSS object-position, e.g. "50% 40%"), so the product is the focus
 */
const Photo = ({ name, alt = '', ratio = 3 / 2, position = 'center', fallback = null, eager = false, sx, children }) => {
  const src = photoUrl(name);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) return fallback;

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', aspectRatio: String(ratio), bgcolor: 'action.hover', ...sx }}>
      <Box
        component="img"
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: position, display: 'block' }}
      />
      {children}
    </Box>
  );
};

export default React.memo(Photo);
