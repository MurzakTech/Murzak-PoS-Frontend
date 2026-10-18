import { useContext, useMemo, useSyncExternalStore } from 'react';
import { ReactReduxContext } from 'react-redux';
import { getUserCompany } from '../../utils/getUserCompany';

/**
 * The signed-in person and their business, for the Settings cards. It reads the app's store when there is one and gives
 * an empty answer when there is none, so a card can be shown (and tested) on its own: with no business it makes no call.
 * `dispatch` sends an action to the store (used to refresh the person's till profile after the till options change).
 */
const none = () => () => {};
const nothing = () => null;

export const useSettingsUser = () => {
  const context = useContext(ReactReduxContext);
  const store = context && context.store;
  const user = useSyncExternalStore(store ? store.subscribe : none, store ? () => store.getState().auth && store.getState().auth.user : nothing);
  return useMemo(() => ({ user, company: user ? getUserCompany(user) : null, dispatch: store ? store.dispatch : () => undefined }), [user, store]);
};

export default useSettingsUser;
