import React, { useState } from 'react';
import Card from '../components/Card';
import Switch from '../components/Switch';
import { readAutoPrint, writeAutoPrint } from './autoPrint';
import T from './strings.settings';

const D = T.till.device;

/**
 * Settings, Till and payments, This device (ticket P5-3): choices kept on this device only. For now that is whether the
 * receipt prints by itself after a sale, kept under the same name the till already reads, so the till follows it the next
 * time it is opened or reloaded. Anyone may change it for the device they are using.
 *
 *   read, write   injectable for tests; they default to this device's storage
 */
const DeviceCard = ({ read = readAutoPrint, write = writeAutoPrint }) => {
  const [on] = useState(read);
  return (
    <div className="nl-settings-card" data-card="this-device">
      <Card title={D.title} subtitle={D.subtitle}>
        <div className="nl-settings-switch">
          <Switch label={D.autoPrint} checked={on} onChange={async (next) => write(next)} />
          <p className="nl-settings-hint">{D.autoPrintHint}</p>
        </div>
      </Card>
    </div>
  );
};

export default DeviceCard;
