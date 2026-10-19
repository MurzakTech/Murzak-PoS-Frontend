import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AdvancedSection from './AdvancedSection';
import BrandSection from '../brand/BrandSection';
import BusinessSection from './BusinessSection';
import SettingsShell from './SettingsShell';
import TaxSection from './TaxSection';
import TeamSection from './TeamSection';
import TillSection from './TillSection';
import { FIRST_SECTION, sectionAddress, sectionFromPath } from './settingsModel';

/**
 * The Settings page (ticket P5-3, acceptance check AC-32): a side list of six sections, Business, Brand and receipts, Till and payments, Tax,
 * Team and security, and Advanced, with a card per group of settings. Each card saves on its own and says "Saved". The open
 * section is part of the address (/new-look/settings/tax), the bare address opens Business, and ?section=<name> outlines one
 * card (the old addresses for brands, units and the rest arrive that way).
 */
const SettingsPage = () => {
  const { pathname, search } = useLocation();
  const section = sectionFromPath(pathname);
  if (!section) return <Navigate replace to={`${sectionAddress(FIRST_SECTION)}${search}`} />;

  let body;
  if (section === 'business') body = <BusinessSection search={search} />;
  else if (section === 'brand') body = <BrandSection />;
  else if (section === 'till') body = <TillSection search={search} />;
  else if (section === 'tax') body = <TaxSection />;
  else if (section === 'team') body = <TeamSection search={search} />;
  else body = <AdvancedSection search={search} />;

  return <SettingsShell section={section}>{body}</SettingsShell>;
};

export default SettingsPage;
