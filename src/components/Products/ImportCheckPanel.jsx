import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Download } from '@mui/icons-material';

const PROBLEMS_SHOWN = 50;
const PREVIEW_ROWS = 5;

/**
 * What we found in a file someone is about to import: how many rows are ready,
 * which rows have problems (with row numbers and reasons), anything worth a
 * second look, and a short preview. Shared by the product and stock imports.
 *
 * Props:
 *   fileProblems       sentences about the file as a whole; when present, nothing else is shown
 *   ready              number of rows that can be imported
 *   invalid            [{ rowNumber, itemCode, itemName?, problems[] }] rows that will be left out
 *   chips              extra summary chips: [{ label, color, variant }]
 *   notices            extra messages: [{ severity, text }]
 *   onDownloadProblems called when "Download rows to fix" is pressed
 *   preview            { columns: [{ key, label, align }], rows: [{ rowNumber, values: {key: text} }] }
 */
const ImportCheckPanel = ({ fileProblems = [], ready, invalid = [], chips = [], notices = [], onDownloadProblems, preview }) => {
  if (fileProblems.length > 0) {
    return (
      <Box sx={{ mt: 3 }}>
        {fileProblems.map((p, i) => (
          <Alert severity="error" key={i} sx={{ mb: 2 }}>{p}</Alert>
        ))}
      </Box>
    );
  }

  const problems = invalid.length;
  const showNames = invalid.some((r) => r.itemName !== undefined);

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip color="success" label={`${ready} ready to import`} />
        {problems > 0 && <Chip color="error" label={`${problems} with problems`} />}
        {chips.map((c) => (
          <Chip key={c.label} color={c.color} variant={c.variant} label={c.label} />
        ))}
      </Stack>

      {notices.map((n, i) => (
        <Alert key={i} severity={n.severity} sx={{ mb: 2 }}>{n.text}</Alert>
      ))}

      {problems > 0 && (
        <Box sx={{ mb: 3 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" startIcon={<Download />} onClick={onDownloadProblems}>
                Download rows to fix
              </Button>
            }
            sx={{ mb: 1 }}
          >
            <AlertTitle>{problems} row{problems === 1 ? '' : 's'} will be left out</AlertTitle>
            {ready > 0
              ? 'The other rows can still be imported now. Download the rows to fix, correct them, and import that file afterwards.'
              : 'Fix these in your file and upload it again.'}
          </Alert>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Row</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>Item code</TableCell>
                  {showNames && <TableCell>Item name</TableCell>}
                  <TableCell>Problem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invalid.slice(0, PROBLEMS_SHOWN).map((r) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.rowNumber}</TableCell>
                    <TableCell>{r.itemCode || '(empty)'}</TableCell>
                    {showNames && <TableCell>{r.itemName || '(empty)'}</TableCell>}
                    <TableCell>{r.problems.join(' ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {problems > PROBLEMS_SHOWN && (
            <Typography variant="caption" color="text.secondary">
              Showing the first {PROBLEMS_SHOWN} of {problems}. Download the rows to fix to see them all.
            </Typography>
          )}
        </Box>
      )}

      {ready > 0 && preview && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Preview{ready > PREVIEW_ROWS ? ` (first ${PREVIEW_ROWS} of ${ready})` : ''}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  {preview.columns.map((c) => (
                    <TableCell key={c.key} align={c.align}>{c.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.rows.slice(0, PREVIEW_ROWS).map((r) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.rowNumber}</TableCell>
                    {preview.columns.map((c) => (
                      <TableCell key={c.key} align={c.align}>{r.values[c.key]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default ImportCheckPanel;
