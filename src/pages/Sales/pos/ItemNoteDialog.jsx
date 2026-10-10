import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { MAX_NOTE, cleanNote } from '../../../utils/kitchenTickets';

/**
 * A note for the kitchen on one item ("no onions", "well done"). Quick notes are one tap;
 * tapping one again takes it back out. The note goes on the ticket, never on the receipt.
 */
const ItemNoteDialog = ({ open, item, quickNotes = [], onSave, onClose }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) setNote(item?.note || '');
  }, [open, item]);

  const parts = note.split(',').map((p) => p.trim()).filter(Boolean);
  const has = (q) => parts.some((p) => p.toLowerCase() === q.toLowerCase());
  const toggle = (q) => setNote((has(q) ? parts.filter((p) => p.toLowerCase() !== q.toLowerCase()) : [...parts, q]).join(', '));

  const submit = (e) => {
    e.preventDefault();
    onSave(cleanNote(note));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="note-title" slotProps={{ paper: { component: 'form', onSubmit: submit } }}>
      <DialogTitle id="note-title">Note for {item?.item_name || 'this item'}</DialogTitle>
      <DialogContent>
        {item?.sentQty > 0 && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 1.5 }}>
            {item.sentQty} already sent. If you change the note, the next ticket tells the kitchen about the change.
          </Typography>
        )}
        {quickNotes.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {quickNotes.map((q) => (
              <Chip key={q} label={q} onClick={() => toggle(q)} color={has(q) ? 'primary' : 'default'} variant={has(q) ? 'filled' : 'outlined'} />
            ))}
          </Box>
        )}
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Note for the kitchen"
          placeholder="For example no onions"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          inputProps={{ maxLength: MAX_NOTE }}
          helperText="Only on the kitchen ticket, not on the customer's receipt."
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        {item?.note && <Button color="inherit" onClick={() => onSave('')} sx={{ mr: 'auto' }}>Remove note</Button>}
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">Save note</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemNoteDialog;
