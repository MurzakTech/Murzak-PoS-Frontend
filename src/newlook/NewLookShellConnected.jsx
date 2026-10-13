import React from 'react';
import NewLookShell from './NewLookShell';
import { useAppSelector } from '../store/hooks';
import { logout } from '../services/authService';
import { useRoleAccess } from '../hooks/useRoleAccess';

/** The shell with the signed-in person and Sign out taken from the app's sign-in */
const NewLookShellConnected = ({ children }) => {
  const user = useAppSelector((state) => state.auth.user);
  const { hasAccess } = useRoleAccess();
  const name = user && (user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email);
  return (
    <NewLookShell user={user ? { name, email: user.email } : undefined} onSignOut={logout} hasAccess={hasAccess}>
      {children}
    </NewLookShell>
  );
};

export default NewLookShellConnected;
