import { useCallback, useEffect, useRef, useState } from 'react';
import { loadQueue, QUEUE_CHANGED_EVENT, QUEUE_KEY, STATUS, syncQueue } from '../utils/offlineSales';
import { sendQueuedSale } from '../api/offlineSalesApi';

const RETRY_EVERY_MS = 30 * 1000;

/**
 * Sales waiting on this device, and their upload. Uploads start when the till opens,
 * when the connection comes back, and every 30 seconds while anything is waiting.
 * `onSynced({ uploaded, flagged })` is called after a round that changed something.
 */
export default function useOfflineSales(company, { onSynced } = {}) {
  const [queue, setQueue] = useState(loadQueue);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    const refresh = () => setQueue(loadQueue());
    const onStorage = (e) => { if (!e.key || e.key === QUEUE_KEY) refresh(); };
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener(QUEUE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (!company || busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      const result = await syncQueue(company, sendQueuedSale);
      if ((result.uploaded || result.flagged) && onSyncedRef.current) onSyncedRef.current(result);
    } finally {
      busy.current = false;
      setSyncing(false);
      setQueue(loadQueue());
    }
  }, [company]);

  const mine = queue.filter((s) => s.company === company);
  const pending = mine.filter((s) => s.status === STATUS.PENDING);
  const needsAttention = mine.filter((s) => s.status === STATUS.NEEDS_ATTENTION);

  // Upload when the till opens and whenever the connection returns
  useEffect(() => {
    if (online && pending.length > 0) syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, company]);

  // Keep trying while sales are waiting (the browser's online flag is not always right)
  useEffect(() => {
    if (pending.length === 0) return undefined;
    const timer = setInterval(() => syncNow(), RETRY_EVERY_MS);
    return () => clearInterval(timer);
  }, [pending.length, syncNow]);

  return { online, syncing, sales: mine, pending, needsAttention, syncNow };
}
