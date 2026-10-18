import React from 'react';
import AuditCard from './AuditCard';
import LinkList from './LinkList';
import SecurityCard from './SecurityCard';
import TeamPeople from './TeamPeople';
import { OLD, legacy, openFromSearch } from './settingsModel';
import { useAccess } from '../access/AccessProvider';
import T from './strings.settings';

const R = T.team.permissions;

/**
 * Settings, Team and security (ticket P5-3). Team replaces the Staff page: People (role and till access, add, change and
 * deactivate), a link to Roles and permissions on the current screen, Security (two-step sign-in) and the Audit trail. An
 * auditor counts as a cashier here, so the audit trail card is a link to the current screen for them, where the server decides. The
 * old addresses /staff and /roles open this section; ?open=<role> brings the roles card into view.
 *
 *   people, security, audit   props for each card (tests)
 */
const TeamSection = ({ search = '', people = {}, security = {}, audit = {} }) => {
  const access = useAccess();
  const open = openFromSearch(search);
  return (
    <>
      <TeamPeople {...people} />
      <LinkList id="roles" title={R.title} subtitle={R.subtitle} items={[{ key: 'roles-and-permissions', text: R.text, to: legacy(OLD.roles) }]} highlightKey={open ? 'roles-and-permissions' : ''} />
      <SecurityCard {...security} />
      {access.tier === 'owner' || access.tier === 'manager' ? <AuditCard {...audit} /> : null}
      {access.tier === 'cashier' ? <LinkList id="audit-trail" title={T.team.audit.title} subtitle={T.team.audit.subtitle} items={[{ key: 'audit-trail', text: T.team.audit.cashierNote, to: legacy(OLD.auditTrail) }]} /> : null}
    </>
  );
};

export default TeamSection;
