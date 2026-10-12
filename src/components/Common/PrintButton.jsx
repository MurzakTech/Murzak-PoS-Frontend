import React, { useState } from 'react';
import { Button, CircularProgress, ListItemText, Menu, MenuItem, Divider } from '@mui/material';
import { Print } from '@mui/icons-material';
import { useAppDispatch } from '../../store/hooks';
import { showNotification } from '../../store/notificationSlice';
import { choicesFor, downloadPdf, getPrintHtml, getPrintPdf, printHtml } from '../../api/printApi';

/**
 * "Print" for a saved document. One format prints straight away; more than one opens a short menu.
 * "Save as PDF" is offered under the formats.
 */
const PrintButton = ({ doctype, name, label = 'Print', variant = 'outlined', size, sx, disabled }) => {
  const dispatch = useAppDispatch();
  const choices = choicesFor(doctype);
  const [anchor, setAnchor] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!name || choices.length === 0) return null;

  const fail = (e) => dispatch(showNotification({ message: e.message, severity: 'error', title: 'Could not print' }));

  const print = async (format) => {
    setAnchor(null);
    setBusy(true);
    try {
      await printHtml(await getPrintHtml(doctype, name, format));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const savePdf = async (format) => {
    setAnchor(null);
    setBusy(true);
    try {
      downloadPdf(await getPrintPdf(doctype, name, format));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const onClick = (e) => (choices.length === 1 ? print(choices[0].format) : setAnchor(e.currentTarget));

  return (
    <>
      <Button
        variant={variant} size={size} sx={{ textTransform: 'none', ...sx }} disabled={disabled || busy} onClick={onClick}
        startIcon={busy ? <CircularProgress size={16} /> : <Print />}
        aria-haspopup={choices.length > 1 ? 'menu' : undefined}
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {choices.map((c) => (
          <MenuItem key={c.format} onClick={() => print(c.format)}><ListItemText>{c.label}</ListItemText></MenuItem>
        ))}
        <Divider />
        {choices.map((c) => (
          <MenuItem key={`pdf-${c.format}`} onClick={() => savePdf(c.format)}>
            <ListItemText secondary="Save as PDF">{c.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default PrintButton;
