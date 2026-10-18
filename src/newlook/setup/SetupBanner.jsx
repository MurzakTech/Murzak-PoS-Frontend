import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Icon from '../components/Icon';
import { useNewLook } from '../NewLookProvider';
import { getSetupState } from '../../api/setupApi';
import { SETUP_PATH, showsBanner, snooze } from './setupModel';
import T from './strings.setup';
import './setup.css';

/**
 * The "Set up now" banner on Home (ticket P5-4, acceptance check AC-33): the one place a new shop is invited to set up. It appears
 * only while the New look is on and only to the owner, only for a NEW store (the server decides: no business kind recorded, no
 * submitted sale, fewer than 5 products, set-up not finished), and not within 7 days of "Not now", which is remembered on this device.
 * A shop that has data never sees it. It asks nothing of the server, and shows nothing, while the New look is off.
 *
 *   load   injectable for tests; defaults to the server call
 *   now    the time, injectable for tests
 */
const SetupBanner = ({ load = getSetupState, now }) => {
  const { enabled, company } = useNewLook();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    load(company)
      .then((answer) => {
        if (!cancelled) setState(answer);
      })
      .catch(() => {
        // The banner is a courtesy: if the server cannot be asked, Home simply goes without it
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, company, load]);

  if (!enabled || hidden || !showsBanner({ state, company, now })) return null;

  const started = state.inProgress;
  return (
    <Card aria-label={T.banner.label}>
      <div className="nl-setup-banner__row">
        <span className="nl-setup-banner__icon">
          <Icon name="settings" />
        </span>
        <div className="nl-setup-banner__text">
          <h2 className="nl-setup-banner__title">{started ? T.banner.continueTitle : T.banner.title}</h2>
          <p className="nl-setup-banner__body">{started ? T.banner.continueText : T.banner.text}</p>
        </div>
        <div className="nl-setup-banner__actions">
          <Button onClick={() => navigate(SETUP_PATH)}>{started ? T.banner.continue : T.banner.setUp}</Button>
          <Button
            variant="ghost"
            onClick={() => {
              snooze(company);
              setHidden(true);
            }}
          >
            {T.banner.notNow}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SetupBanner;
