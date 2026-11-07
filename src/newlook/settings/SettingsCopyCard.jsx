import React, { useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAccess } from '../access/AccessProvider';
import { exportSettings } from '../../api/setupHealthApi';
import { saveTextFile } from '../../utils/saveTextFile';
import fill from '../labels/fill';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

const C = T.copy;

const safeName = (text) => String(text || 'shop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'shop';

/**
 * Settings, Business: "Keep a copy of your settings" (Addendum C, R9). One button that downloads a secret-free file of how the shop is
 * set up. Owners only. It reads; it never changes a setting.
 *
 *   load, save   injectable for tests; they default to the server call and the file download
 */
const SettingsCopyCard = ({ load = exportSettings, save = saveTextFile }) => {
  const access = useAccess();
  const { company } = useSettingsUser();
  const [state, setState] = useState({ status: 'idle', message: '' });
  if (access.tier !== 'owner') return null;

  const run = async () => {
    setState({ status: 'working', message: '' });
    try {
      const data = await load(company || undefined);
      const date = data.exported_on || new Date().toISOString().slice(0, 10);
      save(JSON.stringify(data, null, 2), fill(C.fileName, { shop: safeName(data.company || company), date }), 'application/json');
      setState({ status: 'done', message: C.done });
    } catch (error) {
      setState({ status: 'error', message: error.message });
    }
  };

  return (
    <div className="nl-settings-card" data-card="settings-copy">
      <Card title={C.title} subtitle={C.subtitle}>
        <Button variant="secondary" icon="arrowDown" loading={state.status === 'working'} onClick={run}>
          {state.status === 'working' ? C.working : C.button}
        </Button>
        {state.status === 'done' ? <p className="nl-settings-hint" role="status">{state.message}</p> : null}
        {state.status === 'error' ? <p className="nl-error" role="alert">{state.message}</p> : null}
      </Card>
    </div>
  );
};

export default SettingsCopyCard;
