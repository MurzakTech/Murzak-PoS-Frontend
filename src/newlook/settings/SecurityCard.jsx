import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { Chip } from '../components/Chip';
import { getTwoFactorStatus } from '../../api/twoFactorApi';
import { IDLE_TIMEOUT_MS } from '../../hooks/useIdleSignOut';
import fill from '../labels/fill';
import { OLD, legacy } from './settingsModel';
import T from './strings.settings';

const S = T.team.security;
const IDLE_MINUTES = Math.round(IDLE_TIMEOUT_MS / 60000);

/**
 * Settings, Team and security, Security (ticket P5-3): whether two-step sign-in is on for the signed-in person (a yes or no,
 * read from the call the current Security screen reads), the lock after wrong passwords, the automatic sign-out, and a link
 * to the current Security screen. Turning two-step sign-in on or off needs a QR code and a 6-digit code, so it stays
 * there; no code or key is shown or typed here.
 *
 *   load   injectable for tests; it defaults to the server call
 */
const SecurityCard = ({ load = getTwoFactorStatus }) => {
  const [state, setState] = useState({ status: 'loading', on: false });
  useEffect(() => {
    let live = true;
    load()
      .then((on) => live && setState({ status: 'ready', on: Boolean(on) }))
      .catch(() => live && setState({ status: 'error', on: false }));
    return () => {
      live = false;
    };
  }, [load]);

  return (
    <div className="nl-settings-card" data-card="security">
      <Card title={S.title} subtitle={S.subtitle}>
        <p className="nl-settings-line">
          <strong>{S.twoStep}</strong>
          {state.status === 'loading' ? <span className="nl-settings-hint">{S.loading}</span> : null}
          {state.status === 'ready' ? <Chip icon={state.on ? 'check' : 'x'} tone={state.on ? 'brand' : 'neutral'}>{state.on ? S.on : S.off}</Chip> : null}
          {state.status === 'error' ? <span className="nl-settings-hint">{S.errorText}</span> : null}
        </p>
        <p className="nl-settings-hint">{S.twoStepText}</p>
        <p className="nl-settings-hint">{S.locked}</p>
        {IDLE_MINUTES ? <p className="nl-settings-hint">{fill(S.idle, { minutes: IDLE_MINUTES })}</p> : null}
        <Button as={Link} to={legacy(OLD.security)} variant="secondary" icon="chevronRight" iconEnd>
          {S.link}
        </Button>
      </Card>
    </div>
  );
};

export default SecurityCard;
