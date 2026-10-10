import {
  enqueueSale, loadQueue, localTimestamp, MAX_QUEUED_SALES, offlineBlocker, queueRoom, retrySale,
  STATUS, syncQueue, QUEUE_KEY,
} from './offlineSales';
import { MESSAGES } from './friendlyError';

const sale = (ref, company = 'Shop A') => ({
  payload: { client_reference: ref, customer: 'Walk-in Customer', items: [{ item_code: 'MILK', qty: 1, rate: 60 }] },
  receipt: { grandTotal: 60, itemCount: 1 },
  company,
  user: 'jane@shop.ke',
});

beforeEach(() => localStorage.clear());

describe('offline sales rules', () => {
  it('allows cash only, and no loyalty redemption', () => {
    expect(offlineBlocker({ paymentLines: [{ mode: 'Cash', amount: 100 }] })).toBeNull();
    expect(offlineBlocker({ paymentLines: [{ mode: 'M-Pesa', amount: 100 }] })).toMatch(/Only cash/);
    expect(offlineBlocker({ paymentLines: [{ mode: 'Cash', amount: 50 }, { mode: 'Credit', amount: 50 }] })).toMatch(/Only cash/);
    expect(offlineBlocker({ paymentLines: [{ mode: 'Cash', amount: 100 }], loyaltyPoints: 20 })).toMatch(/Loyalty/);
  });

  it('caps the queue at 200 sales and 24 hours', () => {
    const now = Date.now();
    expect(queueRoom([], now).ok).toBe(true);
    const full = Array.from({ length: MAX_QUEUED_SALES }, (_, i) => ({ status: STATUS.PENDING, queuedAt: now - i }));
    expect(queueRoom(full, now).reason).toMatch(/200 sales/);
    const old = [{ status: STATUS.PENDING, queuedAt: now - 25 * 3600 * 1000 }];
    expect(queueRoom(old, now).reason).toMatch(/24 hours/);
  });

  it('formats the sale time as the server expects', () => {
    expect(localTimestamp(new Date(2026, 9, 10, 9, 5, 3))).toBe('2026-10-10 09:05:03');
  });

  it('stores a sale with its real time and survives as JSON', () => {
    const entry = enqueueSale(sale('POS1'), new Date(2026, 9, 10, 14, 0, 0));
    expect(entry.payload.offline_sold_at).toBe('2026-10-10 14:00:00');
    expect(JSON.parse(localStorage.getItem(QUEUE_KEY))).toHaveLength(1);
    enqueueSale(sale('POS1')); // same id again: kept once
    expect(loadQueue()).toHaveLength(1);
  });
});

describe('uploading', () => {
  it('uploads in order, flags refusals, and stops when the connection drops', async () => {
    enqueueSale(sale('POS1'), new Date(2026, 9, 10, 9));
    enqueueSale(sale('POS2'), new Date(2026, 9, 10, 10));
    enqueueSale(sale('POS3'), new Date(2026, 9, 10, 11));
    enqueueSale(sale('OTHER', 'Shop B'), new Date(2026, 9, 10, 8));
    const sent = [];
    const send = async (payload) => {
      sent.push(payload.client_reference);
      if (payload.client_reference === 'POS2') return { ok: false, connection: false, message: 'Not enough stock' };
      if (payload.client_reference === 'POS3') return { ok: false, connection: true, message: MESSAGES.offline };
      return { ok: true };
    };
    const result = await syncQueue('Shop A', send);
    expect(sent).toEqual(['POS1', 'POS2', 'POS3']);
    expect(result).toEqual({ uploaded: 1, flagged: 1, stoppedOffline: true });
    const left = loadQueue();
    expect(left.map((s) => s.id).sort()).toEqual(['OTHER', 'POS2', 'POS3']);
    expect(left.find((s) => s.id === 'POS2')).toMatchObject({ status: STATUS.NEEDS_ATTENTION, error: 'Not enough stock' });

    retrySale('POS2');
    const again = await syncQueue('Shop A', async () => ({ ok: true }));
    expect(again.uploaded).toBe(2);
    expect(loadQueue().map((s) => s.id)).toEqual(['OTHER']);
  });
});
