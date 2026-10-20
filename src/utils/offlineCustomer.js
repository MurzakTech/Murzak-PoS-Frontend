/**
 * Offline Customer Storage
 *
 * Caches customer lists in IndexedDB so cashiers can search, view, and select
 * customers on offline tills. Also supports creating offline customer records
 * for cash sales when network is down.
 */
import { idbGet, idbSet, idbDelete } from './indexedDb.js';

export const customerKey = (company) => `pos_offline_customers:${company || 'default'}`;

const memoryCustomerCache = new Map();

/**
 * Persists the customer directory for a company into IndexedDB and memory.
 */
export const saveOfflineCustomers = (company, customers) => {
  if (!Array.isArray(customers)) return;
  const key = customerKey(company);
  memoryCustomerCache.set(key, customers);

  // High-capacity persistence
  idbSet(key, customers).catch(() => {});

  // Fallback top slice in localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(customers.slice(0, 100)));
    }
  } catch {
    // Quota reached: safe, IndexedDB retains the full list
  }
};

/**
 * Synchronous customer read from memory or localStorage.
 */
export const loadOfflineCustomers = (company) => {
  const key = customerKey(company);
  if (memoryCustomerCache.has(key)) {
    return memoryCustomerCache.get(key);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryCustomerCache.set(key, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return [];
};

/**
 * Asynchronously read full customer directory from IndexedDB.
 */
export const loadOfflineCustomersAsync = async (company) => {
  const key = customerKey(company);
  try {
    const list = await idbGet(key);
    if (Array.isArray(list) && list.length > 0) {
      memoryCustomerCache.set(key, list);
      return list;
    }
  } catch {
    // fallback
  }
  return loadOfflineCustomers(company);
};

/**
 * Create a new offline customer record for local sales and receipts.
 */
export const createOfflineCustomer = ({ company, customer_name, mobile_no, email_id, customer_type }) => {
  const offlineId = `OFFLINE-${Date.now()}`;
  const newCustomer = {
    name: offlineId,
    customer_name: (customer_name || 'Customer').trim(),
    mobile_no: mobile_no || '',
    email_id: email_id || '',
    customer_type: customer_type || 'Individual',
    customer_group: 'All Customer Groups',
    territory: 'All Territories',
    offline: true,
    created_at: new Date().toISOString(),
  };

  const current = loadOfflineCustomers(company);
  const updated = [newCustomer, ...current.filter((c) => c.name !== offlineId)];
  saveOfflineCustomers(company, updated);
  return newCustomer;
};

/**
 * Clears offline customer storage for a company or all companies.
 */
export const clearOfflineCustomers = (company) => {
  if (company) {
    const key = customerKey(company);
    memoryCustomerCache.delete(key);
    idbDelete(key).catch(() => {});
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {}
  } else {
    memoryCustomerCache.clear();
  }
};
