import React from 'react';
import NewLookShell from './NewLookShell';
import { useAppSelector } from '../store/hooks';
import { logout } from '../services/authService';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { AccessProvider, useAccess } from './access/AccessProvider';

const Shell = ({ children }) => {
  const user = useAppSelector((state) => state.auth.user);
  const { hasAccess } = useRoleAccess();
  const { label } = useAccess();
  const name = user && (user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email);
  return (
    <NewLookShell user={user ? { name, email: user.email, role: label } : undefined} onSignOut={logout} hasAccess={hasAccess}>
      {children}
    </NewLookShell>
  );
};

/** The shell with the signed-in person, their role and Sign out taken from the app's sign-in and the server */
const NewLookShellConnected = ({ children }) => {
  const user = useAppSelector((state) => state.auth.user);
  return (
    <AccessProvider userKey={user && (user.email || user.name)}>
      <Shell>{children}</Shell>
    </AccessProvider>
  );
};

export default NewLookShellConnected;
