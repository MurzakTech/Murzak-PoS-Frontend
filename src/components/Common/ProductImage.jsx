import React, { useEffect, useMemo, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import ProductArt from './ProductArt';
import { artColors, productImageUrl } from '../../utils/productArt';

/**
 * A product's picture: its own photo when it has one, otherwise an
 * illustration that matches what it is. A photo that fails to load (deleted,
 * private, offline) quietly falls back to the illustration, never a broken icon.
 *
 * shape "wide" (2:1) is for product tiles, "square" for list thumbnails.
 */
const ProductImage = ({ product, shape = 'wide', src: srcOverride, sx, rounded = 2, alt }) => {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const src = srcOverride !== undefined ? srcOverride : productImageUrl(product);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  const colors = useMemo(
    () => artColors(product, mode),
    // Only the fields that decide the picture
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product?.item_code, product?.item_name, product?.name, product?.item_group, mode]
  );

  const name = alt ?? (product?.item_name || product?.name || product?.item_code || 'Product');

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: rounded,
        bgcolor: colors.bg2,
        flexShrink: 0,
        ...(shape === 'square' ? { aspectRatio: '1 / 1' } : { aspectRatio: '2 / 1' }),
        ...sx,
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <ProductArt colors={colors} shape={shape} />
        </Box>
      )}
    </Box>
  );
};

export default React.memo(ProductImage);
