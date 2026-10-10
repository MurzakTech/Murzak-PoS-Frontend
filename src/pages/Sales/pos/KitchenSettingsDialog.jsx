import React, { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { AddCircleOutline, AutoFixHigh, DeleteOutline, DesktopWindowsOutlined } from '@mui/icons-material';
import { cleanNote, suggestStations } from '../../../utils/kitchenTickets';

const parseNotes = (text) => [...new Set(text.split(',').map(cleanNote).filter(Boolean))].slice(0, 12);

/**
 * Set up kitchen tickets: switch them on, name the stations (Kitchen, Bar...) and say which categories
 * go to which, and whether the stations also have a screen. The stations, notes and screens setting are
 * shared by every till when the server can keep them; printing is chosen per device.
 *
 * screensStatus is 'unavailable' when the server has no station screen calls yet.
 */
const KitchenSettingsDialog = ({ open, settings, groupNames = [], screensStatus = 'checking', onOpenStation, onSave, onClose }) => {
  const [draft, setDraft] = useState(settings);
  const [quick, setQuick] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setQuick(settings.quickNotes.join(', '));
    }
  }, [open, settings]);

  const patch = (changes) => setDraft((d) => ({ ...d, ...changes }));
  const setStation = (id, changes) => patch({ stations: draft.stations.map((s) => (s.id === id ? { ...s, ...changes } : s)) });

  // A category can go to one station only: choosing it for one takes it from the others
  const setGroups = (id, groups) =>
    patch({ stations: draft.stations.map((s) => (s.id === id ? { ...s, groups } : { ...s, groups: s.groups.filter((g) => !groups.includes(g)) })) });

  const addStation = () => patch({ stations: [...draft.stations, { id: `station-${Date.now().toString(36)}`, name: '', groups: [] }] });
  const removeStation = (id) => patch({
    stations: draft.stations.filter((s) => s.id !== id),
    defaultStation: draft.defaultStation === id ? '' : draft.defaultStation,
  });

  const names = draft.stations.map((s) => s.name.trim().toLowerCase());
  const nameProblem = (s) => (!s.name.trim() ? 'Give the station a name.' : names.filter((n) => n === s.name.trim().toLowerCase()).length > 1 ? 'Two stations have this name.' : '');
  const valid = !draft.enabled || (draft.stations.length > 0 && draft.stations.every((s) => !nameProblem(s)));

  const save = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      ...draft,
      stations: draft.stations.map((s) => ({ ...s, name: s.name.trim() })),
      quickNotes: parseNotes(quick),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="kitchen-title" slotProps={{ paper: { component: 'form', onSubmit: save } }}>
      <DialogTitle id="kitchen-title">Kitchen tickets</DialogTitle>
      <DialogContent>
        <FormControlLabel
          control={<Switch checked={draft.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />}
          label="Send orders to the kitchen and bar from this till"
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Adds a "Send to kitchen" button and notes on items. Each item goes to the station its category is set to, and the ticket prints with the table name. The stations and notes are shared by every till of the business when the server supports it.
        </Typography>

        {draft.enabled && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">Stations</Typography>
              {groupNames.length > 0 && (
                <Button size="small" startIcon={<AutoFixHigh />} onClick={() => patch({ stations: suggestStations(groupNames, draft.stations) })}>
                  Set up from my categories
                </Button>
              )}
            </Box>

            {draft.stations.map((s, i) => (
              <Box key={s.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '170px 1fr auto' }, gap: 1, alignItems: 'start', mb: 1.5 }}>
                <TextField
                  size="small"
                  label={`Station ${i + 1}`}
                  value={s.name}
                  onChange={(e) => setStation(s.id, { name: e.target.value })}
                  error={Boolean(nameProblem(s))}
                  helperText={nameProblem(s) || ' '}
                  inputProps={{ maxLength: 20 }}
                />
                <Autocomplete
                  multiple
                  size="small"
                  options={[...new Set([...groupNames, ...s.groups])]}
                  value={s.groups}
                  onChange={(_, value) => setGroups(s.id, value)}
                  renderInput={(params) => <TextField {...params} label="Categories sent here" placeholder={s.groups.length ? '' : 'Choose categories'} />}
                />
                <IconButton onClick={() => removeStation(s.id)} disabled={draft.stations.length <= 1} aria-label={`Remove ${s.name || `station ${i + 1}`}`}>
                  <DeleteOutline />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddCircleOutline />} onClick={addStation} sx={{ mb: 2 }}>Add a station</Button>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="default-station-label">Items whose category has no station</InputLabel>
              <Select labelId="default-station-label" label="Items whose category has no station" value={draft.defaultStation} onChange={(e) => patch({ defaultStation: e.target.value })}>
                <MenuItem value="">Do not send them</MenuItem>
                {draft.stations.filter((s) => s.name.trim()).map((s) => <MenuItem key={s.id} value={s.id}>Send to {s.name.trim()}</MenuItem>)}
              </Select>
              <FormHelperText>Items that are not sent are listed each time, so none is forgotten.</FormHelperText>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Quick notes (separated by commas)"
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              helperText="One tap each when adding a note to an item."
              sx={{ mb: 1 }}
            />
            <FormControlLabel
              control={<Switch checked={draft.printNow} onChange={(e) => patch({ printNow: e.target.checked })} />}
              label="Print the tickets straight away (this device)"
            />

            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <FormControlLabel
                control={<Switch checked={draft.screens && screensStatus !== 'unavailable'} disabled={screensStatus === 'unavailable'} onChange={(e) => patch({ screens: e.target.checked })} />}
                label="Also show tickets on station screens"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                For a kitchen or bar with a tablet or screen. Tickets appear there as they are sent, and the station marks them Ready so the waiter is told. Printing keeps working as chosen above.
              </Typography>
              {screensStatus === 'unavailable' && (
                <Alert severity="info" sx={{ mb: 1 }}>This server cannot show tickets on station screens yet, so tickets print only.</Alert>
              )}
              {draft.screens && screensStatus !== 'unavailable' && onOpenStation && (
                <Button size="small" variant="outlined" startIcon={<DesktopWindowsOutlined />} onClick={onOpenStation}>Open the station screen on this device</Button>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={!valid}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default KitchenSettingsDialog;
