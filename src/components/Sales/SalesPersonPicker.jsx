import React, { useEffect, useState } from 'react';
import { Box, MenuItem, TextField } from '@mui/material';
import { listSalesPeople } from '../../api/salesPeopleApi';

/**
 * "Sold by": lets the till credit a sale to a sales person. Left on "Me", the sale goes to the cashier's own
 * sales person when their login is linked to one, and to nobody otherwise. Shown only when the business has
 * sales people, so a shop that does not use commission never sees it.
 */
const SalesPersonPicker = ({ company, value, onChange, disabled }) => {
  const [people, setPeople] = useState([]);

  useEffect(() => {
    if (!company) return undefined;
    let current = true;
    listSalesPeople(company).then((rows) => { if (current) setPeople(rows); }).catch(() => {});
    return () => { current = false; };
  }, [company]);

  if (people.length === 0) return null;

  return (
    <Box sx={{ mb: 2.5 }}>
      <TextField
        select fullWidth size="small" label="Sold by" value={value || ''} disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        helperText="Commission goes to this person. Leave on Me to use your own."
      >
        <MenuItem value="">Me</MenuItem>
        {people.map((p) => (
          <MenuItem key={p.name} value={p.name}>
            {p.sales_person_name || p.name}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
};

export default SalesPersonPicker;
