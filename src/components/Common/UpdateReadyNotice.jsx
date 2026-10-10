import React, { useEffect, useState } from 'react';
import { Button, Snackbar } from '@mui/material';

export const UPDATE_READY_EVENT = 'murzak:update-ready';

/**
 * Shown when a new version of the app arrived during a shift. Reloading is left
 * to the person, so a sale being rung up is never lost.
 */
const UpdateReadyNotice = () => {
  const [apply, setApply] = useState(null);

  useEffect(() => {
    const onReady = (event) => setApply(() => event.detail?.apply || null);
    window.addEventListener(UPDATE_READY_EVENT, onReady);
    return () => window.removeEventListener(UPDATE_READY_EVENT, onReady);
  }, []);

  return (
    <Snackbar
      open={Boolean(apply)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      message="A new version of Murzak POS is ready. Reload when you finish the current sale."
      action={(
        <>
          <Button color="inherit" size="small" onClick={() => setApply(null)}>Later</Button>
          <Button color="primary" variant="contained" size="small" onClick={() => apply && apply()}>Reload</Button>
        </>
      )}
    />
  );
};

export default UpdateReadyNotice;
