import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, ListItemIcon, ListItemText, MenuItem,
  Radio, RadioGroup, Typography,
} from '@mui/material';
import { Translate } from '@mui/icons-material';
import { DEFAULT_LANGUAGES, getLanguages, setLanguage } from '../../api/languageApi';

/**
 * "Language" in the user menu. The choice is kept on the server, so the messages it sends (errors, confirmations,
 * printed documents) come in that language on every device the person signs in on.
 */
const LanguageMenuItem = ({ onDone }) => {
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [current, setCurrent] = useState('en');
  const [choice, setChoice] = useState('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    getLanguages()
      .then((r) => { setLanguages(r.languages); setCurrent(r.current); setChoice(r.current); })
      .catch((e) => setError(e.message));
  }, [open]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      setCurrent(await setLanguage(choice));
      setOpen(false);
      if (onDone) onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <MenuItem onClick={() => setOpen(true)}>
        <ListItemIcon><Translate fontSize="small" /></ListItemIcon>
        <ListItemText>Language</ListItemText>
      </MenuItem>
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Language</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Messages from the system, and the documents it prints, come in the language you choose. The words on the screens
            are still in English.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)}>
            {languages.map((l) => <FormControlLabel key={l.code} value={l.code} control={<Radio />} label={l.name} />)}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || choice === current}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LanguageMenuItem;
