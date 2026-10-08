import React, { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { AddAPhotoOutlined, DeleteOutline, AutoAwesomeOutlined } from '@mui/icons-material';
import ProductImage from '../Common/ProductImage';
import { uploadProductImage } from '../../api/uploadImage';
import { friendlyErrorMessage } from '../../utils/friendlyError';
import { productImageUrl } from '../../utils/productArt';

/**
 * Photo picker for a product. Shows what the till will show: the photo once
 * one is added, otherwise the automatic illustration, so nobody feels they
 * must photograph every item before they can start selling.
 */
const ProductPhotoField = ({ value, onChange, product, disabled }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preview = value ? productImageUrl({ image: value }) : null;

  const pick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still triggers a change
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
    } catch (err) {
      setError(err.response ? friendlyErrorMessage(err) : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ position: 'relative', width: 112, flexShrink: 0 }}>
          <ProductImage product={product} src={preview} shape="square" rounded={3} sx={{ width: 112, border: 1, borderColor: 'divider' }} />
          {busy && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', borderRadius: 3, bgcolor: 'rgba(255,255,255,.65)' }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
            Product photo <Typography component="span" variant="caption" color="text.secondary">(optional)</Typography>
          </Typography>
          {!value && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <AutoAwesomeOutlined sx={{ fontSize: 14 }} /> Until you add one, the till shows this picture.
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: value ? 1 : 0 }}>
            <Button size="small" variant="outlined" startIcon={<AddAPhotoOutlined />} onClick={pick} disabled={disabled || busy}>
              {value ? 'Change photo' : 'Add photo'}
            </Button>
            {value && (
              <Button size="small" color="inherit" startIcon={<DeleteOutline />} onClick={() => onChange('')} disabled={disabled || busy} sx={{ color: 'text.secondary' }}>
                Remove
              </Button>
            )}
          </Stack>
        </Box>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} aria-label="Choose a product photo" />
    </Box>
  );
};

export default ProductPhotoField;
