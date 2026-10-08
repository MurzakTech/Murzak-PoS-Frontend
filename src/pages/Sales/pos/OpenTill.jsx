import React from 'react';
import { Controller } from 'react-hook-form';
import { Alert, AlertTitle, Box, Button, Card, CircularProgress, IconButton, MenuItem, Select, Stack, TextField, Typography, InputAdornment } from '@mui/material';
import { Add, DeleteOutline, ArrowBack, LockOpen } from '@mui/icons-material';
import BrandLogo from '../../../components/Common/BrandLogo';

/**
 * Start of shift. Shown instead of the till until a session is open, so a
 * cashier cannot reach the selling screen by accident without opening the till.
 */
const OpenTill = ({ control, fields, errors, paymentModes, onAdd, onRemove, onSubmit, loading, apiLoading, cashierName, storeName, currency, onExit, openError }) => (
  <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', placeItems: 'center', p: 2 }}>
    <Card sx={{ width: '100%', maxWidth: 560, p: { xs: 2.5, sm: 4 }, boxShadow: (t) => t.shadows[6] }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <BrandLogo size={30} />
        <Button color="inherit" startIcon={<ArrowBack />} onClick={onExit} sx={{ color: 'text.secondary' }}>
          Back
        </Button>
      </Box>

      <Typography variant="h3" sx={{ mb: 0.75 }}>
        Open your till
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {cashierName}{storeName ? ` at ${storeName}` : ''}. Count the money you are starting with and enter it below.
      </Typography>

      <form onSubmit={onSubmit}>
        <input type="hidden" {...control.register('pos_profile', { required: 'POS Profile is required' })} />
        <input type="hidden" {...control.register('company')} />
        <input type="hidden" {...control.register('user')} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Opening balance
        </Typography>
        <Stack spacing={1.5} sx={{ mb: 1.5 }}>
          {fields.map((field, index) => (
            <Box key={field.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' }, gap: 1.25, alignItems: 'start' }}>
              <Controller
                name={`balance_details.${index}.mode_of_payment`}
                control={control}
                rules={{ required: 'Choose a payment method' }}
                defaultValue={field.mode_of_payment || 'Cash'}
                render={({ field: f }) => (
                  <Select {...f} aria-label="Payment method" error={!!errors.balance_details?.[index]?.mode_of_payment} sx={{ height: 56 }}>
                    {paymentModes.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                )}
              />
              <Controller
                name={`balance_details.${index}.opening_amount`}
                control={control}
                rules={{ required: 'Enter an amount', min: { value: 0, message: 'Cannot be negative' } }}
                defaultValue={field.opening_amount || 0}
                render={({ field: f }) => (
                  <TextField
                    {...f}
                    type="number"
                    autoFocus={index === 0}
                    error={!!errors.balance_details?.[index]?.opening_amount}
                    helperText={errors.balance_details?.[index]?.opening_amount?.message}
                    onChange={(e) => f.onChange(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    inputProps={{ step: '0.01', min: 0, inputMode: 'decimal', 'aria-label': 'Opening amount', style: { fontSize: '1.25rem', fontWeight: 700, height: 28 } }}
                    InputProps={{ startAdornment: <InputAdornment position="start">{currency}</InputAdornment> }}
                    sx={{ '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 }, '& input[type=number]': { MozAppearance: 'textfield' } }}
                  />
                )}
              />
              <IconButton onClick={() => onRemove(index)} disabled={fields.length <= 1} aria-label="Remove this payment method" color="error" sx={{ mt: 0.75 }}>
                <DeleteOutline />
              </IconButton>
            </Box>
          ))}
        </Stack>
        <Button type="button" size="small" startIcon={<Add />} onClick={onAdd} sx={{ mb: 3 }}>
          Add another payment method
        </Button>

        {/* Why the last attempt failed stays on screen until the next try, so it can be read and acted on */}
        {openError && !loading && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            <AlertTitle>The till could not be opened</AlertTitle>
            {openError}
          </Alert>
        )}

        <Button
          type="submit"
          fullWidth
          size="large"
          variant="contained"
          disabled={loading || apiLoading}
          startIcon={loading || apiLoading ? <CircularProgress size={22} color="inherit" /> : <LockOpen />}
          sx={{ height: 60, fontSize: '1.125rem', fontWeight: 750, borderRadius: 3 }}
        >
          {loading ? 'Opening...' : apiLoading ? 'Getting ready...' : 'Open till and start selling'}
        </Button>
      </form>
    </Card>
  </Box>
);

export default OpenTill;
