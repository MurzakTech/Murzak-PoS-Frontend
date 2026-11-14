import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { chosenOptions, missingGroup, toggleChoice } from '../../../utils/menuOptions';
import { money } from './money';

/**
 * Menu options (restaurants and bars): shown when a waiter adds a dish that has options. Each group is a row of chips:
 * a choose-one group (How cooked) takes one, a choose-several group (Extras, Leave out) takes any. A required group must
 * be chosen before the dish can be added. Priced options add to the dish's price.
 *
 * onAdd({ options, extra, text })  the choice, checked
 */
const MenuOptionsDialog = ({ open, product, groups = [], basePrice = 0, onAdd, onClose }) => {
  const [picked, setPicked] = useState({});

  useEffect(() => {
    if (open) setPicked({});
  }, [open, product]);

  const missing = missingGroup(groups, picked);
  const choice = chosenOptions(groups, picked);
  const total = (Number(basePrice) || 0) + choice.extra;

  const submit = (e) => {
    e.preventDefault();
    if (!missing) onAdd(choice);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="options-title" slotProps={{ paper: { component: 'form', onSubmit: submit } }}>
      <DialogTitle id="options-title">{product?.item_name || product?.name || 'Options'}</DialogTitle>
      <DialogContent>
        {groups.map((group) => {
          const names = picked[group.name] || [];
          return (
            <Box key={group.name} sx={{ mb: 2 }} role="group" aria-label={group.name}>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                {group.name}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {group.required ? (group.multiple ? 'Choose at least one' : 'Choose one') : group.multiple ? 'Optional, any' : 'Optional'}
                </Typography>
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {group.choices.map((c) => {
                  const on = names.includes(c.name);
                  return (
                    <Chip
                      key={c.name}
                      label={Number(c.price) ? `${c.name} +${money(c.price)}` : c.name}
                      color={on ? 'primary' : 'default'}
                      variant={on ? 'filled' : 'outlined'}
                      aria-pressed={on}
                      onClick={() => setPicked((prev) => toggleChoice(prev, group, c.name))}
                      sx={{ minHeight: 40 }}
                    />
                  );
                })}
              </Stack>
            </Box>
          );
        })}
        {choice.text ? (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {choice.text}
          </Typography>
        ) : null}
        {missing ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Choose {missing} to add this.
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={Boolean(missing)}>
          Add · {money(total)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MenuOptionsDialog;
