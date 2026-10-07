import React, { useMemo } from 'react';
import { Box, Button, ButtonBase, CircularProgress, IconButton, InputBase, Skeleton, Typography, useMediaQuery } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, Close, QrCodeScanner, Inventory2Outlined, LocalOffer } from '@mui/icons-material';
import EmptyState from '../../../components/Common/EmptyState';
import { fmt } from './money';

const ProductTile = React.memo(({ product, price, originalPrice, discountLabel, stockQty, cartQty, uom, disabled, onAdd }) => {
  const out = stockQty !== null && stockQty < 1;
  const short = stockQty !== null && !out && stockQty < cartQty + 1 && cartQty > 0;
  const low = stockQty !== null && !out && stockQty <= 5;

  return (
    <ButtonBase
      focusRipple
      disabled={disabled}
      onClick={() => onAdd(product)}
      aria-label={`${product.item_name || product.item_code}, ${price > 0 ? `${fmt(price)} Kenya shillings` : 'price entered at sale'}${stockQty !== null ? `, ${stockQty} in stock` : ''}${cartQty ? `, ${cartQty} in cart` : ''}`}
      sx={{
        position: 'relative',
        textAlign: 'left',
        alignItems: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 1,
        minHeight: 112,
        p: 1.5,
        borderRadius: 3,
        border: 1,
        borderColor: cartQty ? 'primary.main' : 'divider',
        bgcolor: (t) => (cartQty ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.06) : t.palette.background.paper),
        boxShadow: (t) => t.shadows[1],
        transition: 'transform .08s ease, box-shadow .15s ease, border-color .15s ease',
        userSelect: 'none',
        '&:hover': { boxShadow: (t) => t.shadows[4], borderColor: 'primary.main' },
        '&:active': { transform: 'scale(0.97)' },
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 650,
          lineHeight: 1.25,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          pr: cartQty ? 3.5 : 0,
          minHeight: '2.5em',
        }}
      >
        {product.item_name || product.name || product.item_code}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          {originalPrice !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through', lineHeight: 1.2 }}>
                {fmt(originalPrice)}
              </Typography>
              {discountLabel && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 0.75, borderRadius: 1.5, bgcolor: 'success.main', color: 'success.contrastText' }}>
                  <LocalOffer sx={{ fontSize: 11 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.5 }}>{discountLabel}</Typography>
                </Box>
              )}
            </Box>
          )}
          {price > 0 || originalPrice !== null ? (
            <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums', color: originalPrice !== null ? 'success.main' : 'text.primary', lineHeight: 1.15 }}>
              {fmt(price)}
            </Typography>
          ) : (
            <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1.6 }}>
              Enter price
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            per {uom}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          {out ? (
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>Out of stock</Typography>
          ) : short ? (
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main' }}>Only {fmt(stockQty)} left</Typography>
          ) : low ? (
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main' }}>{fmt(stockQty)} left</Typography>
          ) : stockQty !== null ? (
            <Typography variant="caption" color="text.secondary">{fmt(stockQty)} in stock</Typography>
          ) : null}
        </Box>
      </Box>

      {cartQty > 0 && (
        <Box
          aria-hidden="true"
          sx={{ position: 'absolute', top: 8, right: 8, minWidth: 26, height: 26, px: 0.75, borderRadius: 999, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800, fontSize: '0.8125rem' }}
        >
          {cartQty}
        </Box>
      )}
    </ButtonBase>
  );
});
ProductTile.displayName = 'ProductTile';

const ProductPanel = ({
  searchTerm,
  setSearchTerm,
  searchInputRef,
  onSearchEnter,
  categories,
  selectedCategory,
  setSelectedCategory,
  products,
  visibleCount,
  onShowMore,
  isLoading,
  getTileData,
  addToCart,
  hasStore,
  priceListNote,
  onAddProducts,
}) => {
  const compact = useMediaQuery((t) => t.breakpoints.down('sm'));
  // Desk tills start with the cursor in search; phones and tablets do not, or the keyboard covers the products
  const autoFocusSearch = useMemo(() => {
    try {
      return window.matchMedia('(pointer: fine)').matches;
    } catch (e) {
      return true;
    }
  }, []);

  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Search / scan: always ready. A barcode scanner types the code and presses Enter. */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, flexShrink: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            height: 56,
            px: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 2,
            borderColor: 'divider',
            transition: 'border-color .15s ease, box-shadow .15s ease',
            '&:focus-within': { borderColor: 'primary.main', boxShadow: (t) => `0 0 0 4px ${alpha(t.palette.primary.main, 0.14)}` },
          }}
        >
          <Search sx={{ color: 'text.secondary' }} />
          <InputBase
            fullWidth
            autoFocus={autoFocusSearch}
            inputRef={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearchEnter();
              } else if (e.key === 'Escape' && searchTerm) {
                e.stopPropagation();
                setSearchTerm('');
              }
            }}
            placeholder={compact ? 'Search or scan' : 'Scan a barcode or search products'}
            inputProps={{ 'aria-label': 'Scan a barcode or search products', autoComplete: 'off', spellCheck: false }}
            sx={{ fontSize: '1.125rem' }}
          />
          {searchTerm ? (
            <IconButton aria-label="Clear search" onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}>
              <Close />
            </IconButton>
          ) : (
            <QrCodeScanner sx={{ color: 'text.disabled' }} aria-hidden="true" />
          )}
        </Box>

        <Box
          role="group"
          aria-label="Product categories"
          sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {categories.map((c) => {
            const selected = selectedCategory === c.id;
            return (
              <ButtonBase
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                aria-pressed={selected}
                sx={{
                  flexShrink: 0,
                  height: 40,
                  px: 2,
                  borderRadius: 999,
                  fontWeight: 650,
                  fontSize: '0.875rem',
                  border: 1,
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: selected ? 'primary.main' : 'background.paper',
                  color: selected ? 'primary.contrastText' : 'text.primary',
                  transition: 'background-color .15s ease',
                  '&:hover': { bgcolor: selected ? 'primary.dark' : 'action.hover' },
                }}
              >
                {c.name}
              </ButtonBase>
            );
          })}
        </Box>
        {priceListNote && (
          <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
            {priceListNote.loading && <CircularProgress size={10} />} {priceListNote.text}
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pb: 2, overscrollBehavior: 'contain' }}>
        {isLoading ? (
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(168px, 1fr))' } }} aria-busy="true" aria-label="Loading products">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={112} />
            ))}
          </Box>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Inventory2Outlined />}
            title={searchTerm || selectedCategory !== 'all' ? 'No products match' : 'No products to sell yet'}
            description={searchTerm || selectedCategory !== 'all' ? 'Try a different word, or choose All Products.' : 'Add your products first, then they will appear here as tiles.'}
            actions={
              searchTerm || selectedCategory !== 'all'
                ? [{ label: 'Clear filters', onClick: () => { setSearchTerm(''); setSelectedCategory('all'); }, variant: 'outlined' }]
                : [{ label: 'Add products', onClick: onAddProducts }]
            }
          />
        ) : (
          <>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(168px, 1fr))' } }}>
              {products.slice(0, visibleCount).map((product) => {
                const d = getTileData(product);
                return (
                  <ProductTile
                    key={product.item_code || product.name}
                    product={product}
                    price={d.price}
                    originalPrice={d.originalPrice}
                    discountLabel={d.discountLabel}
                    stockQty={d.stockQty}
                    cartQty={d.cartQty}
                    uom={d.uom}
                    disabled={!hasStore}
                    onAdd={addToCart}
                  />
                );
              })}
            </Box>
            {products.length > visibleCount && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button variant="outlined" onClick={onShowMore}>
                  Show more ({products.length - visibleCount} more)
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default ProductPanel;
