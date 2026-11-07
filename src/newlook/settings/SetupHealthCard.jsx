import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Icon from '../components/Icon';
import { SkeletonText } from '../components/Skeleton';
import { useAccess } from '../access/AccessProvider';
import { Link } from 'react-router-dom';
import { getSetupHealth } from '../../api/setupHealthApi';
import { sectionAddress } from './settingsModel';
import fill from '../labels/fill';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const H = T.health;

// Where each check can be fixed in the new Settings, so the line is a link and not only a sentence
const FIX_SECTION = { stores: 'business', till: 'till', cash: 'till', mpesa: 'till', etims: 'tax' };

const STATUS_WORD = { green: H.fine, amber: H.look, red: H.fix };

const KEY = 'nl-setup-health-open';
// The person's own choice to open or close the list is remembered on this device; it works without storage too
const remembered = () => {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === 'open' ? true : value === 'closed' ? false : null;
  } catch (e) {
    return null;
  }
};
const remember = (open) => {
  try {
    window.localStorage.setItem(KEY, open ? 'open' : 'closed');
  } catch (e) {
    /* nothing to do: it just opens as usual next time */
  }
};
const many = (count, one, more) => fill(count === 1 ? one : more, { count });

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
  const [chosen, setChosen] = useState(remembered); // true, false, or null when the person has not chosen

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
    const headline = summary.red > 0 ? many(summary.red, H.needFixing, H.needFixingMany) : summary.amber > 0 ? many(summary.amber, H.worthLooking, H.worthLookingMany) : H.allGood;
    const percent = typeof state.report.percent === 'number' ? state.report.percent : Math.round((100 * summary.green) / Math.max(checks.length, 1));
    const broken = checks.filter((check) => check.status === 'red');
    // Shown open when something needs attention, closed when all is well, unless the person has chosen
    const open = chosen === null ? summary.red + summary.amber > 0 : chosen;
    const toggle = () => {
      remember(!open);
      setChosen(!open);
    };
    body = (
      <>
        {broken.length > 0 ? (
          <p className="nl-settings-error" role="alert">
            <Icon name="alert" />
            <span>{fill(H.alert, { names: broken.map((check) => check.title).join(', ') })}</span>
          </p>
        ) : null}
        <div className="nl-health-summary">
          <div
            className={`nl-health-bar nl-health-bar--${summary.red > 0 ? 'red' : summary.amber > 0 ? 'amber' : 'green'}`}
            role="progressbar"
            aria-label={H.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <strong className="nl-health-percent">{fill(H.percent, { percent })}</strong>
        </div>
        <p className="nl-settings-note" role="status">
          {headline}
        </p>
        <div className="nl-health-toggle">
          <Button variant="secondary" size="small" onClick={toggle} aria-expanded={open}>
            {open ? H.hide : H.show}
          </Button>
        </div>
        {open ? (
          <ul className="nl-settings-list nl-health-list">
          {checks.map((check) => (
            <li key={check.id} className={`nl-health nl-health--${check.status}`}>
              <strong>{check.title}</strong> <span className="nl-health__status">{STATUS_WORD[check.status]}</span>
              <p className="nl-settings-hint">{check.detail}</p>
              {check.status !== 'green' && check.where ? <p className="nl-settings-hint">{fill(H.where, { where: check.where })}</p> : null}
              {check.status !== 'green' && FIX_SECTION[check.id] ? (
                <p className="nl-settings-hint">
                  <Link to={sectionAddress(FIX_SECTION[check.id])}>{H.goThere}</Link>
                </p>
              ) : null}
            </li>
          ))}
          </ul>
        ) : null}
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
