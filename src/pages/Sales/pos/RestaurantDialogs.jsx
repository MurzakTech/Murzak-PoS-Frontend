import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { equalShares, minutesOpen, tableMap } from '../../../utils/restaurant';
import { heldTotal } from '../../../utils/heldSales';
import { money } from './money';

/**
 * Restaurants and bars at the till: the toolbar and the four dialogs it opens (table map, split bill, delivery order,
 * tip). Each dialog only asks; the till does the work (see NewSale.js), so these stay simple and tested on their own.
 */

/** The row of restaurant buttons above the bill's main action, and the delivery platform the bill is for */
export const RestaurantToolbar = ({ tablesOn, onTables, onSplit, onDelivery, onTip, channel, onClearChannel, splitDisabled }) => (
  <Box sx={{ mb: 1.5 }}>
    {channel ? (
      <Chip
        color="secondary"
        size="small"
        label={`${channel.channel}${channel.ref ? ` · ${channel.ref}` : ''}`}
        onDelete={onClearChannel}
        sx={{ mb: 1 }}
        aria-label={`Delivery order: ${channel.channel}`}
      />
    ) : null}
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {tablesOn ? (
        <Button size="small" variant="outlined" onClick={onTables} sx={{ minHeight: 40 }}>
          Tables
        </Button>
      ) : null}
      <Button size="small" variant="outlined" onClick={onSplit} disabled={splitDisabled} sx={{ minHeight: 40 }}>
        Split bill
      </Button>
      <Button size="small" variant="outlined" onClick={onDelivery} sx={{ minHeight: 40 }}>
        Delivery order
      </Button>
      <Button size="small" variant="outlined" onClick={onTip} sx={{ minHeight: 40 }}>
        Tip
      </Button>
    </Stack>
  </Box>
);

const STATUS_WORDS = { free: 'Free', open: 'Open', here: 'On this till' };

/** The store's tables: free, open (with its bill, how long and how much) or the one on this till */
export const TableMapDialog = ({ open, tables = [], held = [], current, currency = 'KES', billOnScreen, onOpenTable, onStartTable, onClose }) => {
  const map = useMemo(() => tableMap(tables, held, current), [tables, held, current]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="tables-title">
      <DialogTitle id="tables-title">Tables</DialogTitle>
      <DialogContent>
        {tables.length === 0 ? (
          <Alert severity="info">No tables are set for this store yet. The owner or a manager adds them under Settings, Business, Restaurant and bar.</Alert>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1 }} role="list" aria-label="Tables">
            {map.tables.map((t) => {
              const mins = t.held ? minutesOpen(t.held.held_at || t.held.heldAt) : null;
              const tone = t.status === 'free' ? 'success.main' : t.status === 'open' ? 'warning.main' : 'primary.main';
              return (
                <ButtonBase
                  key={t.name}
                  role="listitem"
                  aria-label={`${t.name}: ${STATUS_WORDS[t.status]}`}
                  disabled={t.status === 'here'}
                  onClick={() => (t.status === 'open' ? onOpenTable(t.held) : onStartTable(t.name))}
                  sx={{ p: 1.25, minHeight: 84, borderRadius: 2, border: 2, borderColor: tone, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {t.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tone, fontWeight: 600 }}>
                    {STATUS_WORDS[t.status]}
                  </Typography>
                  {t.held ? (
                    <Typography variant="caption" color="text.secondary">
                      {money(Array.isArray(t.held.cart) ? heldTotal(t.held) : t.held.total || 0, currency)}
                      {mins !== null ? ` · ${mins} min` : ''}
                    </Typography>
                  ) : null}
                </ButtonBase>
              );
            })}
          </Box>
        )}
        {billOnScreen ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Tapping a free table names the bill on screen after it. To open another table's bill, hold or finish this one first.
          </Typography>
        ) : null}
        {map.others.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Other open bills: {map.others.map((h) => h.label || 'Unnamed').join(', ')}. Find them under Held sales.
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

/** Splitting the bill: by item (this guest pays for these, the rest stays open) or equally between several people */
export const SplitBillDialog = ({ open, cart = [], total = 0, currency = 'KES', onSplitItems, onSplitEqually, onClose }) => {
  const [tab, setTab] = useState(0);
  const [picks, setPicks] = useState({});
  const [people, setPeople] = useState(2);

  useEffect(() => {
    if (open) {
      setPicks({});
      setPeople(2);
    }
  }, [open]);

  const change = (line, delta) =>
    setPicks((prev) => ({ ...prev, [line.item_code]: Math.min(Math.max((prev[line.item_code] || 0) + delta, 0), Number(line.qty) || 0) }));
  const chosen = cart.reduce((sum, l) => sum + ((picks[l.item_code] || 0) * (l.subtotal ?? l.rate * l.qty)) / (l.qty || 1), 0);
  const anyPicked = Object.values(picks).some((q) => q > 0);
  const allPicked = cart.every((l) => (picks[l.item_code] || 0) >= l.qty);
  const shares = equalShares(total, people);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="split-title">
      <DialogTitle id="split-title">Split the bill</DialogTitle>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth" aria-label="How to split">
        <Tab label="By item" />
        <Tab label="Equally" />
      </Tabs>
      <DialogContent>
        {tab === 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Choose what this guest pays for. It is charged now; the rest stays open on the same table.
            </Typography>
            {cart.map((line) => (
              <Box key={line.item_code} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {line.item_name} <Typography component="span" variant="caption" color="text.secondary">of {line.qty}</Typography>
                </Typography>
                <IconButton size="small" aria-label={`One less ${line.item_name}`} onClick={() => change(line, -1)}>
                  <Remove fontSize="small" />
                </IconButton>
                <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }} aria-label={`${line.item_name} for this guest`}>
                  {picks[line.item_code] || 0}
                </Typography>
                <IconButton size="small" aria-label={`One more ${line.item_name}`} onClick={() => change(line, 1)}>
                  <Add fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
              This guest: {money(chosen, currency)}
            </Typography>
            {allPicked ? <Alert severity="info" sx={{ mt: 1 }}>That is the whole bill: charge it as it is instead.</Alert> : null}
          </>
        ) : (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                Number of people
              </Typography>
              <IconButton size="small" aria-label="One person fewer" onClick={() => setPeople((n) => Math.max(2, n - 1))}>
                <Remove fontSize="small" />
              </IconButton>
              <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }} aria-label="People sharing">
                {people}
              </Typography>
              <IconButton size="small" aria-label="One person more" onClick={() => setPeople((n) => Math.min(20, n + 1))}>
                <Add fontSize="small" />
              </IconButton>
            </Stack>
            <Typography variant="body2">
              Each pays {money(shares[shares.length - 1], currency)}
              {shares[0] !== shares[shares.length - 1] ? ` (the first pays ${money(shares[0], currency)})` : ''}.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              The bill is charged once, with one payment per person (M-Pesa, cash or card), using Split on the pay screen.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {tab === 0 ? (
          <Button variant="contained" disabled={!anyPicked || allPicked} onClick={() => onSplitItems(picks)}>
            Charge this guest
          </Button>
        ) : (
          <Button variant="contained" onClick={() => onSplitEqually(people, shares)}>
            Take {people} payments
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/** Marking the bill as an order from a delivery platform, with the platform's own order number */
export const DeliveryOrderDialog = ({ open, platforms = [], value, onSave, onClose }) => {
  const [channel, setChannel] = useState('');
  const [ref, setRef] = useState('');
  useEffect(() => {
    if (open) {
      setChannel(value?.channel || platforms[0]?.name || '');
      setRef(value?.ref || '');
    }
  }, [open, value, platforms]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="delivery-title">
      <DialogTitle id="delivery-title">Delivery order</DialogTitle>
      <DialogContent>
        {platforms.length === 0 ? (
          <Alert severity="info">No delivery platforms are set. Add them under Settings, Business, Restaurant and bar.</Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Platform" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {platforms.map((p) => (
                <MenuItem key={p.name} value={p.name}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Platform order number" value={ref} onChange={(e) => setRef(e.target.value)} inputProps={{ maxLength: 60 }} autoComplete="off" />
            <Typography variant="caption" color="text.secondary">
              Take the payment the way the platform pays you. The order shows in the delivery platform report with its commission.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!channel} onClick={() => onSave({ channel, ref: ref.trim() })}>
          Mark as {channel || 'delivery'} order
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/** A tip a guest left: kept apart from the sale, and shown on the waiter cash-up */
export const TipDialog = ({ open, modes = [], waiterName, currency = 'KES', onSave, onClose }) => {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setAmount('');
      setMode(modes[0] || '');
      setSaving(false);
      setError('');
    }
  }, [open, modes]);
  const value = Number(amount);
  const submit = async (e) => {
    e.preventDefault();
    if (!(value > 0) || !mode) return;
    setSaving(true);
    setError('');
    try {
      await onSave({ amount: value, mode });
    } catch (err) {
      setError(err.message || 'The tip could not be recorded.');
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs" aria-labelledby="tip-title" slotProps={{ paper: { component: 'form', onSubmit: submit } }}>
      <DialogTitle id="tip-title">Record a tip</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={`Tip (${currency})`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputProps={{ inputMode: 'decimal' }} autoFocus />
          <TextField select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value)}>
            {modes.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" color="text.secondary">
            {waiterName ? `For ${waiterName}. ` : ''}A tip is the staff's money: it is kept apart from the sale and shows on the waiter cash-up.
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={!(value > 0) || !mode || saving}>
          {saving ? 'Saving…' : 'Record tip'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
