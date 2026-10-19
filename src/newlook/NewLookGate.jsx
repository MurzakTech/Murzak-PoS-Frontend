import React from 'react';
import { useNewLook } from './NewLookProvider';
import S from './strings';

/**
 * Holds the app back for the moment it takes to learn whether this shop uses the New look, so the earlier screens never flash up
 * first. It only waits when nothing is known yet (status 'loading': signed in, no saved "on", the server not yet asked). Once the
 * server answers, or fails to, the app opens: with the look it answered, or the earlier screens if the server could not be asked.
 */
const NewLookGate = ({ children }) => {
  const { status } = useNewLook();
  if (status !== 'loading') return children;
  return (
    <div className="nl-gate" role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'inherit', opacity: 0.7 }}>
      {S.shell.shell.loading}
    </div>
  );
};

export default NewLookGate;
