import {
  saveOfflineCustomers,
  loadOfflineCustomers,
  loadOfflineCustomersAsync,
  createOfflineCustomer,
  clearOfflineCustomers,
  customerKey,
} from './offlineCustomer';

describe('offlineCustomer storage', () => {
  beforeEach(() => {
    clearOfflineCustomers('Shop A');
    localStorage.clear();
  });

  it('saves and synchronously loads customer directory', () => {
    const list = [
      { name: 'CUST-001', customer_name: 'Alice Wambui', mobile_no: '0711000111' },
      { name: 'CUST-002', customer_name: 'Bob Kiprono', mobile_no: '0722000222' },
    ];
    saveOfflineCustomers('Shop A', list);
    const loaded = loadOfflineCustomers('Shop A');
    expect(loaded).toHaveLength(2);
    expect(loaded[0].customer_name).toBe('Alice Wambui');
  });

  it('asynchronously loads customer directory from IndexedDB', async () => {
    const list = [{ name: 'CUST-003', customer_name: 'Charlie Otieno' }];
    saveOfflineCustomers('Shop A', list);
    const loaded = await loadOfflineCustomersAsync('Shop A');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('CUST-003');
  });

  it('creates an offline customer record and prepends it', () => {
    const newCust = createOfflineCustomer({
      company: 'Shop A',
      customer_name: 'David Mutua',
      mobile_no: '0733000333',
      email_id: 'david@example.com',
      customer_type: 'Individual',
    });

    expect(newCust.offline).toBe(true);
    expect(newCust.customer_name).toBe('David Mutua');
    expect(newCust.name).toMatch(/^OFFLINE-/);

    const current = loadOfflineCustomers('Shop A');
    expect(current[0].customer_name).toBe('David Mutua');
  });

  it('clears offline customers cleanly', () => {
    saveOfflineCustomers('Shop A', [{ name: 'CUST-001', customer_name: 'Alice' }]);
    clearOfflineCustomers('Shop A');
    expect(loadOfflineCustomers('Shop A')).toHaveLength(0);
  });
});
