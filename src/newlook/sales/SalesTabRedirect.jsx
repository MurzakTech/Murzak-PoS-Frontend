import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { NEW_LOOK_PREFIX } from '../redirects/engine';

/**
 * /new-look/sales/unpaid, /new-look/sales/returns and /new-look/sales/sessions are the tabs of the Sales page (the old
 * Returns and Opening Entries addresses redirect here). Whatever else was in the address, such as `open`, is kept.
 */
const SalesTabRedirect = ({ tab }) => {
  const { search } = useLocation();
  const next = new URLSearchParams(search);
  next.set('tab', tab);
  return <Navigate to={`${NEW_LOOK_PREFIX}/sales?${next.toString()}`} replace />;
};

const UNPAID = 'unpaid';
const RETURNS = 'returns';
const SESSIONS = 'sessions';
export const UnpaidRedirect = () => <SalesTabRedirect tab={UNPAID} />;
export const ReturnsRedirect = () => <SalesTabRedirect tab={RETURNS} />;
export const SessionsRedirect = () => <SalesTabRedirect tab={SESSIONS} />;

export default SalesTabRedirect;
