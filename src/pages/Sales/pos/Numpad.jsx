import React from 'react';
import { Box, ButtonBase } from '@mui/material';
import { Backspace } from '@mui/icons-material';

/** Large touch number pad shared by the cash screen and the price keypad. */
const Numpad = ({ onKey }) => {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', '.'];
  const keyBtn = {
    height: 60,
    borderRadius: 2.5,
    border: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    fontSize: '1.375rem',
    fontWeight: 650,
    fontVariantNumeric: 'tabular-nums',
    '&:hover': { bgcolor: 'action.hover' },
    '&:active': { transform: 'scale(.96)' },
  };
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }} role="group" aria-label="Number pad">
      {keys.map((k) => (
        <ButtonBase key={k} sx={keyBtn} onClick={() => onKey(k)} aria-label={k === '.' ? 'Decimal point' : k}>
          {k}
        </ButtonBase>
      ))}
      <ButtonBase sx={{ ...keyBtn, color: 'text.secondary' }} onClick={() => onKey('back')} aria-label="Backspace">
        <Backspace />
      </ButtonBase>
      <ButtonBase sx={{ ...keyBtn, gridColumn: 'span 2', fontSize: '1rem', color: 'text.secondary' }} onClick={() => onKey('clear')}>
        Clear
      </ButtonBase>
    </Box>
  );
};

export default Numpad;
