import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { SkeletonText } from '../components/Skeleton';
import { useAccess } from '../access/AccessProvider';
import { listAuditEvents } from '../../api/auditApi';
import fill from '../labels/fill';
import { whenLabel } from './teamModel';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const R = T.recent;
const HOW_MANY = 5;

/**
 * Settings, Business: the last few changes to settings, in plain sentences ("Turned off 'Take sold items out of stock'"), from
 * the same audit trail the Team section shows in full. Owners only; shown nothing when the trail cannot be read, because it is an
 * extra and must never block Settings.
 *
 *   load   injectable for tests; defaults to the server call
 */
const RecentChangesCard = ({ load = listAuditEvents }) => {
  const access = useAccess();
  const { company } = useSettingsUser();
  const owner = access.tier === 'owner';
  const [state, setState] = useState({ status: 'loading', events: [] });

  useEffect(() => {
    if (!owner) return undefined;
    let live = true;
    load({ company, module: 'Settings', limit_start: 0, limit_page_length: HOW_MANY })
      .then((result) => live && setState({ status: 'ready', events: result.events.slice(0, HOW_MANY) }))
      .catch(() => live && setState({ status: 'none', events: [] }));
    return () => {
      live = false;
    };
  }, [owner, company, load]);

  if (!owner || state.status === 'none') return null;

  return (
    <div className="nl-settings-card" data-card="recent-changes">
      <Card title={R.title} subtitle={R.subtitle}>
        {state.status === 'loading' ? (
          <div aria-busy="true" aria-label={R.loading}>
            <SkeletonText lines={3} />
          </div>
        ) : state.events.length === 0 ? (
          <p className="nl-settings-hint">{R.none}</p>
        ) : (
          <ul className="nl-settings-list">
            {state.events.map((event) => (
              <li key={event.id} className="nl-settings-hint">
                {fill(R.line, { when: whenLabel(event.timestamp), who: event.user, what: event.summary })}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default RecentChangesCard;
