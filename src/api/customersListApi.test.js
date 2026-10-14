import axiosInstance from './axiosInstance';
import {
  assignLoyaltyProgram,
  createCustomer,
  getCreditHistory,
  getCreditLimit,
  getCustomerFormOptions,
  getCustomerOverview,
  getCustomerStatement,
  getLoyaltyBalance,
  getPointsHistory,
  listCustomers,
  listLoyaltyPrograms,
  redeemPoints,
  removeCreditLimit,
  setCreditLimit,
  updateCustomer,
} from './customersListApi';

jest.mock('./axiosInstance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const reply = (data) => ({ data: { message: { success: true, data } } });
const LIST = 'murzak_pos.api.customers_list_api';
const CUSTOMER = 'murzak_pos.api.customer_api';
const LOYALTY = 'murzak_pos.api.loyalty';

beforeEach(() => jest.resetAllMocks());

describe('listCustomers', () => {
  test('asks for the tab, the filters and the page, leaving out what is empty', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [], summary: {}, total: 0 }));
    await listCustomers({ tab: 'owing', search: 'wanjiru', type: 'Company', page: 2, pageSize: 50 });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${LIST}.list_customers_overview`, { params: { tab: 'owing', search: 'wanjiru', customer_type: 'Company', page: 2, page_size: 50 } });
    await listCustomers();
    expect(axiosInstance.get).toHaveBeenLastCalledWith(`${LIST}.list_customers_overview`, { params: { tab: 'all', page: 1, page_size: 20 } });
  });

  test('an unknown tab or type is not sent', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [] }));
    await listCustomers({ tab: 'unpaid', type: 'Government' });
    expect(axiosInstance.get.mock.calls[0][1].params).toEqual({ tab: 'all', page: 1, page_size: 20 });
  });

  test('returns the rows, the summary and the counts', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }], summary: { customers: 40, owing_total: 500, owing_customers: 2 }, total: 41, page: 2, page_size: 20, pages: 3 }));
    await expect(listCustomers({ page: 2 })).resolves.toEqual({ rows: [{ id: 'A' }], summary: { customers: 40, owing_total: 500, owing_customers: 2 }, total: 41, page: 2, pageSize: 20, pages: 3 });
  });

  test('fills in what the server leaves out', async () => {
    axiosInstance.get.mockResolvedValue(reply({ rows: [{ id: 'A' }] }));
    await expect(listCustomers()).resolves.toEqual({ rows: [{ id: 'A' }], summary: {}, total: 1, page: 1, pageSize: 20, pages: 1 });
  });

  test('a refusal, a missing answer or a network failure becomes a plain message', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: false, message: 'Could not load the customers. Please try again.' } } });
    await expect(listCustomers()).rejects.toThrow('Could not load the customers. Please try again.');
    axiosInstance.get.mockResolvedValue({ data: {} });
    await expect(listCustomers()).rejects.toThrow();
    axiosInstance.get.mockRejectedValue(new Error('Network Error'));
    await expect(listCustomers()).rejects.toThrow(/internet|connection/i);
  });
});

describe('the panel and the statement', () => {
  test('the panel is asked for by customer number', async () => {
    axiosInstance.get.mockResolvedValue(reply({ id: 'CUST-1', balance: 100 }));
    await expect(getCustomerOverview('CUST-1', 'Demo Shop')).resolves.toEqual({ id: 'CUST-1', balance: 100 });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${LIST}.get_customer_overview`, { params: { customer: 'CUST-1', company: 'Demo Shop' } });
  });

  test('the statement is asked for with the period', async () => {
    axiosInstance.get.mockResolvedValue(reply({ lines: [], closing_balance: 0 }));
    await getCustomerStatement({ customer: 'CUST-1', from: '2026-09-01', to: '2026-09-30' });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${LIST}.get_customer_statement`, { params: { customer: 'CUST-1', from_date: '2026-09-01', to_date: '2026-09-30' } });
  });

  test('a statement refused to a cashier is a plain message', async () => {
    axiosInstance.get.mockRejectedValue({ response: { status: 403, data: {} } });
    await expect(getCustomerStatement({ customer: 'CUST-1' })).rejects.toThrow();
  });

  test('the form options always carry both features', async () => {
    axiosInstance.get.mockResolvedValue(reply({ features: { groups: true }, groups: ['A'] }));
    await expect(getCustomerFormOptions()).resolves.toEqual({ features: { groups: true, territories: false }, groups: ['A'], territories: [] });
  });
});

describe('adding and editing a customer', () => {
  test('create sends the till quick-add fields and answers the new number', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true, data: { name: 'CUST-9', customer_name: 'Amina Hassan' } } } });
    const made = await createCustomer({ name: 'Amina Hassan', mobile: '+254712345678', email: '', taxId: 'A012345678Z', type: 'Individual', company: 'Demo Shop' });
    expect(made).toEqual({ id: 'CUST-9', name: 'Amina Hassan' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${CUSTOMER}.create_customer`, { customer_name: 'Amina Hassan', mobile_no: '+254712345678', tax_id: 'A012345678Z', customer_type: 'Individual', company: 'Demo Shop' });
  });

  test('a name already used comes back as an error with the code duplicate', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: "Customer 'Amina' already exists for company 'Demo Shop'", error_type: 'duplicate' } } });
    await expect(createCustomer({ name: 'Amina' })).rejects.toMatchObject({ code: 'duplicate' });
  });

  test('update sends only what changed and can clear the email, the PIN and the mobile', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true, message: 'ok' } } });
    await updateCustomer({ id: 'CUST-9', name: 'Amina H', email: '', taxId: '', mobile: '', disabled: true, company: 'Demo Shop' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${CUSTOMER}.update_customer`, { name: 'CUST-9', customer_name: 'Amina H', email_id: '', tax_id: '', mobile_no: '', disabled: true, company: 'Demo Shop' });
  });

  test('update leaves a field alone when it is not given', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true } } });
    await updateCustomer({ id: 'CUST-9', disabled: false });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${CUSTOMER}.update_customer`, { name: 'CUST-9', disabled: false });
  });

  test('a failed save is a plain message', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: false, message: 'Validation error: nope' } } });
    await expect(updateCustomer({ id: 'X', name: 'Y' })).rejects.toThrow();
  });
});

describe('credit', () => {
  test('the limit, what is owed and what is left', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { customer: 'C', credit_limits: { credit_limit: 5000, effective_credit_limit: 5000, outstanding_amount: 1200, available_credit: 3800, limit_source: 'Customer', is_over_limit: false } } } } });
    await expect(getCreditLimit('C', 'Demo Shop')).resolves.toEqual({ limit: 5000, effective: 5000, owed: 1200, available: 3800, source: 'Customer', over: false, bypass: false });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${CUSTOMER}.get_customer_credit_limit`, { params: { customer: 'C', company: 'Demo Shop' } });
  });

  test('set and remove call the current methods', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { success: true, data: {} } } });
    await setCreditLimit({ customer: 'C', company: 'Demo Shop', limit: '7500' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${CUSTOMER}.set_customer_credit_limit`, { customer: 'C', company: 'Demo Shop', credit_limit: 7500 });
    await removeCreditLimit({ customer: 'C', company: 'Demo Shop' });
    expect(axiosInstance.post).toHaveBeenLastCalledWith(`${CUSTOMER}.remove_customer_credit_limit`, { customer: 'C', company: 'Demo Shop' });
  });

  test('a refused limit is a plain message', async () => {
    axiosInstance.post.mockRejectedValue({ response: { status: 403, data: {} } });
    await expect(setCreditLimit({ customer: 'C', company: 'D', limit: 1 })).rejects.toThrow();
  });

  test('the history is asked for with the dates and answers rows and a count', async () => {
    axiosInstance.get.mockResolvedValue({ data: { message: { success: true, data: { transactions: [{ voucher_no: 'V1' }], total_count: 9 } } } });
    await expect(getCreditHistory({ customer: 'C', company: 'Demo Shop', from: '2026-09-01', to: '2026-09-30' })).resolves.toEqual({ rows: [{ voucher_no: 'V1' }], total: 9 });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${CUSTOMER}.get_customer_credit_history`, { params: { customer: 'C', company: 'Demo Shop', from_date: '2026-09-01', to_date: '2026-09-30', limit: 50, offset: 0 } });
  });
});

describe('loyalty', () => {
  const ok = (extra) => ({ data: { message: { status: 'success', ...extra } } });

  test('the programmes are listed with an active flag', async () => {
    axiosInstance.get.mockResolvedValue(ok({ programs: [{ name: 'P1', loyalty_program_name: 'Duka Points', loyalty_program_type: 'Single Tier Program', from_date: '2026-01-01', to_date: '2026-12-31' }, { name: 'P2', loyalty_program_name: 'Old', to_date: '2025-01-01' }] }));
    const programs = await listLoyaltyPrograms('Demo Shop', '2026-10-13');
    expect(programs.map((p) => [p.title, p.active])).toEqual([['Duka Points', true], ['Old', false]]);
    expect(axiosInstance.get).toHaveBeenCalledWith(`${LOYALTY}.list_loyalty_programs`, { params: { company: 'Demo Shop' } });
  });

  test('assigning a programme sends the customer and the programme', async () => {
    axiosInstance.post.mockResolvedValue(ok({}));
    await assignLoyaltyProgram({ customer: 'C', program: 'Duka Points', company: 'Demo Shop' });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${LOYALTY}.assign_loyalty_program`, { customer_id: 'C', loyalty_program_name: 'Duka Points', company: 'Demo Shop' });
  });

  test('the balance is the points and the last movements', async () => {
    axiosInstance.get.mockResolvedValue(ok({ points_balance: 120, recent_transactions: [{ points_earned: 20 }] }));
    await expect(getLoyaltyBalance('C', 'Demo Shop')).resolves.toEqual({ points: 120, recent: [{ points_earned: 20 }] });
  });

  test('redeeming sends a whole number of points and an optional reference', async () => {
    axiosInstance.post.mockResolvedValue(ok({ redeemed_points: 50, remaining_points: 70 }));
    await expect(redeemPoints({ customer: 'C', points: '50', reference: '', company: 'Demo Shop' })).resolves.toEqual({ redeemed: 50, remaining: 70 });
    expect(axiosInstance.post).toHaveBeenCalledWith(`${LOYALTY}.redeem_points`, { customer_id: 'C', points_to_redeem: 50, company: 'Demo Shop' });
  });

  test('too few points comes back as a plain message', async () => {
    axiosInstance.post.mockResolvedValue({ data: { message: { status: 'failure', message: 'Insufficient loyalty points' } } });
    await expect(redeemPoints({ customer: 'C', points: 5000 })).rejects.toThrow('Insufficient loyalty points');
  });

  test('the history is asked for with its dates and kind of movement', async () => {
    axiosInstance.get.mockResolvedValue(ok({ transactions: [{ name: 'T1' }], pagination: { total_records: 31, total_pages: 2 } }));
    await expect(getPointsHistory({ customer: 'C', from: '2026-09-01', to: '2026-09-30', type: 'earn', page: 2 })).resolves.toEqual({ rows: [{ name: 'T1' }], total: 31, pages: 2 });
    expect(axiosInstance.get).toHaveBeenCalledWith(`${LOYALTY}.get_points_history`, { params: { customer_id: 'C', start_date: '2026-09-01', end_date: '2026-09-30', transaction_type: 'earn', page: 2, limit: 20 } });
  });
});
