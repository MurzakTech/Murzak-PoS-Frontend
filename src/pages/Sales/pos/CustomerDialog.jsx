import React from 'react';
import { Controller } from 'react-hook-form';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputAdornment,
  InputLabel, List, ListItemButton, ListItemText, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import { Close, ArrowBack, PersonAdd, Search, PersonOutline, Phone, Email, AccountBalance } from '@mui/icons-material';
import { fmt } from './money';

const CustomerDialog = ({
  open, onClose, showAddForm, setShowAddForm, resetForm, handleFormSubmit, onCreate, formControl, formErrors, isCreating,
  searchTerm, setSearchTerm, customers, isLoading, onSelect, currency,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="customer-dialog-title">
    <DialogTitle id="customer-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {showAddForm && (
        <IconButton onClick={() => { setShowAddForm(false); resetForm(); }} aria-label="Back to customer list" edge="start">
          <ArrowBack />
        </IconButton>
      )}
      <Box sx={{ flexGrow: 1 }}>{showAddForm ? 'New customer' : 'Who is buying?'}</Box>
      <IconButton onClick={onClose} aria-label="Close"><Close /></IconButton>
    </DialogTitle>

    <DialogContent>
      {showAddForm ? (
        <form onSubmit={handleFormSubmit(onCreate)} id="pos-new-customer-form">
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Controller
              name="customer_name"
              control={formControl}
              rules={{ required: 'Enter the customer name' }}
              render={({ field }) => (
                <TextField {...field} autoFocus label="Customer name" error={!!formErrors.customer_name} helperText={formErrors.customer_name?.message}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutline fontSize="small" /></InputAdornment> }} />
              )}
            />
            <Controller
              name="mobile_no"
              control={formControl}
              render={({ field }) => (
                <TextField {...field} label="Mobile number" type="tel" placeholder="0712 345 678"
                  InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }} />
              )}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="email_id"
                control={formControl}
                rules={{ pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'That does not look like an email address' } }}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Email (optional)" type="email" error={!!formErrors.email_id} helperText={formErrors.email_id?.message}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }} />
                )}
              />
              <Controller
                name="tax_id"
                control={formControl}
                render={({ field }) => (
                  <TextField {...field} fullWidth label="KRA PIN (optional)"
                    InputProps={{ startAdornment: <InputAdornment position="start"><AccountBalance fontSize="small" /></InputAdornment> }} />
                )}
              />
            </Stack>
            <Controller
              name="customer_type"
              control={formControl}
              render={({ field }) => (
                <FormControl>
                  <InputLabel>Customer type</InputLabel>
                  <Select {...field} label="Customer type">
                    <MenuItem value="Individual">Individual</MenuItem>
                    <MenuItem value="Company">Company</MenuItem>
                    <MenuItem value="Partnership">Partnership</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Stack>
        </form>
      ) : (
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Search by name, phone or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            inputProps={{ 'aria-label': 'Search customers' }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          />
          <List disablePadding sx={{ maxHeight: 380, overflowY: 'auto' }}>
            <ListItemButton onClick={() => onSelect({ name: 'Walk-in Customer', customer_name: 'Walk-in Customer' })} sx={{ borderRadius: 2 }}>
              <ListItemText primary="Walk-in customer" secondary="No account needed. Best for quick cash sales." primaryTypographyProps={{ fontWeight: 700 }} />
              <Chip size="small" label="Default" />
            </ListItemButton>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : customers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" color="text.secondary">No customers match.</Typography>
              </Box>
            ) : (
              customers.map((c) => (
                <ListItemButton key={c.name} onClick={() => onSelect(c)} sx={{ borderRadius: 2 }}>
                  <ListItemText
                    primary={c.customer_name || c.name}
                    secondary={[c.mobile_no, c.email_id].filter(Boolean).join('  ·  ') || c.customer_type}
                    primaryTypographyProps={{ fontWeight: 650 }}
                  />
                  {c.available_credit > 0 && <Chip size="small" variant="outlined" label={`Credit ${currency} ${fmt(c.available_credit)}`} />}
                </ListItemButton>
              ))
            )}
          </List>
        </Stack>
      )}
    </DialogContent>

    <DialogActions sx={{ justifyContent: showAddForm ? 'flex-end' : 'space-between' }}>
      {showAddForm ? (
        <>
          <Button color="inherit" onClick={() => { setShowAddForm(false); resetForm(); }}>Cancel</Button>
          <Button type="submit" form="pos-new-customer-form" variant="contained" disabled={isCreating} startIcon={isCreating ? <CircularProgress size={18} color="inherit" /> : null}>
            {isCreating ? 'Saving...' : 'Save and use customer'}
          </Button>
        </>
      ) : (
        <>
          <Button startIcon={<PersonAdd />} onClick={() => setShowAddForm(true)}>New customer</Button>
          <Button color="inherit" onClick={onClose}>Cancel</Button>
        </>
      )}
    </DialogActions>
  </Dialog>
);

export default CustomerDialog;
