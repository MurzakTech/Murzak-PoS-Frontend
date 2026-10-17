import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PURCHASES_PATH } from './purchasesModel';

/**
 * /new-look/purchases/orders and /new-look/purchases/returns are the Orders and Returns tabs of the Purchases page (the old
 * Submit Order and Purchase Returns addresses redirect here). A `purchase` in the address opens that purchase's panel.
 */
const TabRedirect = ({ tab }) => {
  const { search } = useLocation();
  const purchase = new URLSearchParams(search).get('purchase');
  const next = new URLSearchParams({ tab });
  if (purchase) next.set('open', purchase);
  return <Navigate to={`${PURCHASES_PATH}?${next.toString()}`} replace />;
};

const ORDERS = 'orders';
const RETURNS = 'returns';
export const OrdersRedirect = () => <TabRedirect tab={ORDERS} />;
export const ReturnsRedirect = () => <TabRedirect tab={RETURNS} />;

export default TabRedirect;
