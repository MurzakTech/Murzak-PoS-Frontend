import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { useAppSelector } from '../../store/hooks';
import useRoleAccess from '../../hooks/useRoleAccess';
import { onlineStoreAccess } from '../../config/roleAccessConfig';
import { getUserCompany } from '../../utils/getUserCompany';
import { useToast } from '../components/Toast';
import fill from '../labels/fill';
import S from './strings.ecommerce';

/**
 * Draws nothing. While someone is signed in, tells them the moment an online order arrives, wherever they are in the app, so
 * a new order is not found an hour later. The message carries only the order's number and where it came from (never who
 * ordered). Without the live connection nothing is shown; the Online orders screen still finds the order when it is opened.
 */
const OnlineOrderAlert = () => {
  const toast = useToast();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const company = isAuthenticated ? getUserCompany(user) : '';
  // Only the people who work the online orders are told about them
  const { roles } = useRoleAccess();
  const mayHear = onlineStoreAccess(roles).orders;

  useRealtimeRefresh({
    kind: 'online_order',
    company,
    enabled: Boolean(isAuthenticated && company && mayHear),
    onRefresh: (message) => {
      // The call with no message is only "the connection came back"
      if (!message) return;
      toast.info(fill(S.alert.newOrder, { order: message.name, channel: S.orders.channels[message.channel] || message.channel }));
    },
  });

  return null;
};

export default OnlineOrderAlert;
