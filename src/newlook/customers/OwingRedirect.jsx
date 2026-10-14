import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { NEW_LOOK_PREFIX } from '../redirects/engine';

/**
 * /new-look/customers/owing is the Owing tab of the Customers page (the old Customer Credit address redirects here). A
 * `customer` in the address opens that customer's panel.
 */
const OwingRedirect = () => {
  const { search } = useLocation();
  const customer = new URLSearchParams(search).get('customer');
  const next = new URLSearchParams({ tab: 'owing' });
  if (customer) next.set('open', customer);
  return <Navigate to={`${NEW_LOOK_PREFIX}/customers?${next.toString()}`} replace />;
};

export default OwingRedirect;
