import React from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Typography } from '@mui/material';
import { ticketTitle } from '../../../utils/kitchenTickets';

const minutesSince = (iso) => {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / 60000)) : null;
};

const ageText = (iso) => {
  const m = minutesSince(iso);
  if (m === null) return '';
  return m < 1 ? 'just now' : m === 1 ? '1 minute ago' : `${m} minutes ago`;
};

/**
 * What the stations have marked Ready and nobody has taken yet. The waiter presses Served once it
 * has gone to the table or the number has been called, which takes it off every screen.
 */
const ReadyTicketsDialog = ({ open, tickets, onServe, onClose }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="ready-title">
    <DialogTitle id="ready-title">Ready to serve</DialogTitle>
    <DialogContent dividers={tickets.length > 0}>
      {tickets.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Nothing is waiting. Orders appear here when the kitchen or bar marks them Ready.</Typography>
      ) : (
        <List disablePadding>
          {tickets.map((t) => (
            <ListItem
              key={t.id}
              disableGutters
              secondaryAction={<Button size="small" variant="contained" color="success" onClick={() => onServe(t.id)} aria-label={`Served ${ticketTitle(t)} ${t.station}`}>Served</Button>}
              sx={{ pr: 11 }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 800 }}>{ticketTitle(t)}</Typography>
                    <Chip size="small" label={`#${t.number}`} />
                    <Chip size="small" variant="outlined" label={t.station} />
                  </Box>
                }
                secondary={`Ready ${ageText(t.statusAt || t.createdAt)}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button variant="contained" onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default ReadyTicketsDialog;
