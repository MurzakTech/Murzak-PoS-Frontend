import React, { useEffect, useState } from 'react';
import { Typography } from '@mui/material';

// A clock that updates once a minute (and only itself re-renders, not the whole till)
const Clock = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  return (
    <Typography variant="subtitle2" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', fontWeight: 600 }}>
      {now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
    </Typography>
  );
};

export default React.memo(Clock);
