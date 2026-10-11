import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { CONNECTED_POLL_MS, isConnected, subscribeConnection, subscribeMessages } from '../realtime/realtimeClient';

/**
 * Lets a screen refresh the moment the server says something changed (docs/REALTIME_EVENTS.md).
 *
 *  - kind: 'payment' or 'kitchen'; messages of the other kind are ignored.
 *  - company: when given, messages for another business are ignored.
 *  - enabled: nothing is listened to (and no connection opened) while false.
 *  - onRefresh(): called for each matching message, and again each time the connection comes back up,
 *    because messages sent while it was down are lost.
 *
 * Returns whether the live connection is up. The screen should then poll slowly (see pollEvery); the
 * message is only a nudge, so polling stays as the safety net.
 */
const useRealtimeRefresh = ({ kind, company, enabled = true, onRefresh }) => {
  const watch = useCallback((notify) => (enabled ? subscribeConnection(notify) : () => {}), [enabled]);
  const connected = useSyncExternalStore(watch, () => enabled && isConnected());
  const latest = useRef({});
  latest.current = { kind, company, onRefresh };

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeMessages((message) => {
      const { kind: wanted, company: mine, onRefresh: refresh } = latest.current;
      if (wanted && message.kind !== wanted) return;
      if (mine && message.company && message.company !== mine) return;
      if (refresh) refresh(message);
    });
  }, [enabled]);

  useEffect(() => {
    if (enabled && connected && latest.current.onRefresh) latest.current.onRefresh(null);
  }, [enabled, connected]);

  return connected;
};

/** How often a screen polls: its normal pace, or the slow safety-net pace while the live connection is up. */
export const pollEvery = (normalMs, connected) => (connected ? Math.max(normalMs, CONNECTED_POLL_MS) : normalMs);

export default useRealtimeRefresh;
