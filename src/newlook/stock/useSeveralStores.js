import { useContext, useEffect, useSyncExternalStore } from 'react';
import { ReactReduxContext } from 'react-redux';
import { listWarehouses } from '../../store/warehouseSlice';
import { showsWarehouseMenu } from '../till/sellingLocations';

const none = () => () => {};
const nothing = () => null;

/**
 * Does this shop sell from two or more places? A one-store shop never sees Stores or the transfer screens, which only make sense with a
 * second store (the same rule the till's "Take stock from" menu and Stock levels use: real selling locations only, see
 * till/sellingLocations.js). It asks for the shop's warehouses once, through the same store the rest of the app uses. With no store
 * behind it (or no answer yet) the answer is no, so the extra buttons stay out of the way.
 */
const useSeveralStores = () => {
  const context = useContext(ReactReduxContext);
  const store = context && context.store;
  const state = useSyncExternalStore(store ? store.subscribe : none, store ? store.getState : nothing);
  const company = state && state.auth && state.auth.user && state.auth.user.company;

  useEffect(() => {
    if (store && company) store.dispatch(listWarehouses({ company, limit: 1000 }));
  }, [store, company]);

  const warehouses = state && state.warehouse && state.warehouse.warehouses;
  return showsWarehouseMenu(warehouses || []);
};

export default useSeveralStores;
