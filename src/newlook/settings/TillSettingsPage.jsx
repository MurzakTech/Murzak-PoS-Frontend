import React from 'react';
import { useLocation } from 'react-router-dom';
import SettingsShell from './SettingsShell';
import TillSection from './TillSection';
import { SECTION } from './settingsModel';

/**
 * Settings, Till and payments (tickets P3-1 and P5-3): the payment method switches, now inside the Settings page with its
 * side list, plus the till options, the device choices and the links to the current screens (see TillSection).
 *
 *   load, save   injectable for tests: they go to the payment method switches
 */
const TillSettingsPage = ({ load, save, ...rest }) => {
  const { search } = useLocation();
  return (
    <SettingsShell section={SECTION.till}>
      <TillSection payments={{ ...(load ? { load } : {}), ...(save ? { save } : {}) }} search={search} {...rest} />
    </SettingsShell>
  );
};

export default TillSettingsPage;
