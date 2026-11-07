import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { SkeletonText } from '../components/Skeleton';
import { useAccess } from '../access/AccessProvider';
import { getSetupHealth } from '../../api/setupHealthApi';
import fill from '../labels/fill';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const H = T.health;

const STATUS_WORD = { green: H.fine, amber: H.look, red: H.fix };

/**
 * Settings, Business: "Setup health" (Addendum C, R1). Lists what must be in place for the shop to work, each line fine,
 * worth a look, or needs fixing, with one plain sentence and where to go. Owners and managers only. It only reads: it never
 * changes a setting. It shows nothing when the answer cannot be read, because it is an extra and must never block Settings.
 *
 *   load   injectable for tests; defaults to the server call
 */
const SetupHealthCard = ({ load = getSetupHealth }) => {
  const access = useAccess();
  const { company } = useSettingsUser();
  const allowed = access.tier === 'owner' || access.tier === 'manager';
  const [state, setState] = useState({ status: 'loading', report: null });

  useEffect(() => {
    if (!allowed) return undefined;
    let live = true;
    setState({ status: 'loading', report: null });
    load(company || undefined).then((report) => {
      if (live) setState(report ? { status: 'ready', report } : { status: 'none', report: null });
    });
    return () => {
      live = false;
    };
  }, [allowed, company, load]);

  if (!allowed || state.status === 'none') return null;

  let body;
  if (state.status === 'loading') {
    body = (
      <div aria-busy="true" aria-label={H.loading}>
        <SkeletonText lines={4} />
      </div>
    );
  } else {
    const { checks, summary } = state.report;
    const headline = summary.red > 0 ? fill(H.needFixing, { count: summary.red }) : summary.amber > 0 ? fill(H.worthLooking, { count: summary.amber }) : H.allGood;
    body = (
      <>
        <p className="nl-settings-note" role="status">
          {headline}
        </p>
        <ul className="nl-settings-list nl-health-list">
          {checks.map((check) => (
            <li key={check.id} className={`nl-health nl-health--${check.status}`}>
              <strong>{check.title}</strong> <span className="nl-health__status">{STATUS_WORD[check.status]}</span>
              <p className="nl-settings-hint">{check.detail}</p>
              {check.status !== 'green' && check.where ? <p className="nl-settings-hint">{fill(H.where, { where: check.where })}</p> : null}
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="nl-settings-card" data-card="setup-health">
      <Card title={H.title} subtitle={H.subtitle}>
        {body}
      </Card>
    </div>
  );
};

export default SetupHealthCard;
