import React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { PASSWORD_RULES } from '../../utils/passwordRules';

/**
 * A live list of the password rules, ticked off as the person types.
 * Each line says met or not met in words too, for screen readers.
 */
const PasswordChecklist = ({ password = '', sx }) => (
  <Box component="ul" aria-label="Password requirements" sx={{ listStyle: 'none', p: 0, m: 0, mt: 0.75, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.25, ...sx }}>
    {PASSWORD_RULES.map((rule) => {
      const met = rule.test(password);
      return (
        <Box component="li" key={rule.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {met ? (
            <CheckCircle sx={{ fontSize: 15, color: 'success.main' }} />
          ) : (
            <RadioButtonUnchecked sx={{ fontSize: 15, color: 'text.disabled' }} />
          )}
          <Typography variant="caption" sx={{ color: met ? 'success.dark' : 'text.secondary' }}>
            {rule.label}
            <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              {met ? ' (done)' : ' (not yet)'}
            </Box>
          </Typography>
        </Box>
      );
    })}
  </Box>
);

export default PasswordChecklist;
