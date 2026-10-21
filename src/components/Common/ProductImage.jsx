import React, { useEffect, useMemo, useState } from 'react';
import ProductArt from './ProductArt';
import { artColors, productImageUrl } from '../../utils/productArt';
import { useThemeMode } from '../../theme/ThemeProvider';

/**
 * A product's picture: its own photo when it has one, otherwise an
 * illustration that matches what it is. A photo that fails to load (deleted,
 * private, offline) quietly falls back to the illustration, never a broken icon.
 *
 * shape "wide" (2:1) is for product tiles, "square" for list thumbnails.
 */
const ProductImage = ({ product, shape = 'wide', src: srcOverride, style, className = '', rounded = 'var(--radius-card)', alt }) => {
  const { mode } = useThemeMode();
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
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: typeof rounded === 'number' ? `${rounded * 4}px` : rounded,
        backgroundColor: colors.bg2,
        flexShrink: 0,
        aspectRatio: shape === 'square' ? '1 / 1' : '2 / 1',
        ...style,
      }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0 }}>
          <ProductArt colors={colors} shape={shape} />
        </div>
      )}
    </div>
  );
};

export default React.memo(ProductImage);
