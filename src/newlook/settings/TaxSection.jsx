import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { Chip } from '../components/Chip';
import { SkeletonText } from '../components/Skeleton';
import { getEtimsStatus } from '../../api/taxApi';
import { OLD, legacy } from './settingsModel';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const E = T.tax.etims;

// The server refuses anyone but an owner or an accounts manager in words that include "System Manager" or "permission"
const isRefusal = (message) => /permission|system manager|accounts manager|only/i.test(String(message || ''));

/** The words and icon for what eTIMS is doing. */
export const etimsView = (status) => {
  if (!status.found) return { chip: E.notSetUp, icon: 'info', text: E.notSetUpText };
  if (!status.active) return { chip: E.off, icon: 'x', text: E.offText };
  if (status.test) return { chip: E.testMode, icon: 'alert', text: E.testText };
  return { chip: E.on, icon: 'check', text: E.onText };
};

/**
 * Settings, Tax (ticket P5-3): whether eTIMS (the link with the Kenya Revenue Authority) is on, read from the call the
 * current eTIMS screen reads, and a link to that screen to change anything. The server never sends keys or passwords with
 * it, and none are asked for or kept here.
 *
 *   load   injectable for tests; it defaults to the server call
 */
const TaxSection = ({ load = getEtimsStatus }) => {
  const { company } = useSettingsUser();
  const [state, setState] = useState({ status: company ? 'loading' : 'nocompany', value: null });

  const reload = useCallback(() => {
    if (!company) {
      setState({ status: 'nocompany', value: null });
      return;
    }
    setState({ status: 'loading', value: null });
    load(company)
      .then((value) => setState({ status: 'ready', value }))
      .catch((e) => setState({ status: isRefusal(e.message) ? 'refused' : 'error', value: null }));
  }, [company, load]);
  useEffect(reload, [reload]);

  let line;
  if (state.status === 'loading') line = <div aria-busy="true" aria-label={E.loading}><SkeletonText lines={2} /></div>;
  else if (state.status === 'ready') {
    const view = etimsView(state.value);
    line = (
      <>
        <p className="nl-settings-line">
          <strong>{E.line}</strong>
          <Chip icon={view.icon} tone={state.value.found && state.value.active && !state.value.test ? 'brand' : 'neutral'}>
            {view.chip}
          </Chip>
        </p>
        <p className="nl-settings-hint">{view.text}</p>
      </>
    );
  } else if (state.status === 'refused') line = <p className="nl-settings-hint">{E.noAccess}</p>;
  else if (state.status === 'error') {
    line = (
      <p className="nl-settings-hint">
        {E.errorText}{' '}
        <Button variant="ghost" size="small" onClick={reload}>
          {T.shell.retry}
        </Button>
      </p>
    );
  } else line = <p className="nl-settings-hint">{T.business.noCompany}</p>;

  return (
    <div className="nl-settings-card" data-card="etims">
      <Card title={E.title} subtitle={E.subtitle}>
        {line}
        <p className="nl-settings-hint">{E.note}</p>
        <p className="nl-settings-hint">{E.taxIdNote}</p>
        <Button as={Link} to={legacy(OLD.etims)} variant="secondary" icon="chevronRight" iconEnd>
          {E.link}
        </Button>
      </Card>
    </div>
  );
};

export default TaxSection;
