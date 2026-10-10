import { canAccessRoute, isRouteAllowed, resolveRoutePattern, getAllowedRoutes } from './roleAccessConfig';
import { protectedRoutes } from '../routes/routes';

const can = (role, path) => canAccessRoute(path, [role]);

describe('every screen has an access rule', () => {
  const collect = (list) => list.flatMap((r) => [r.path, ...collect(r.children || [])]);

  test('each protected route resolves to itself', () => {
    // A screen missing from ROUTE_GROUPS would be refused to everyone but admins
    collect(protectedRoutes).forEach((path) => {
      expect(resolveRoutePattern(path)).toBe(path);
    });
  });
});

describe('a permission covers one screen, not everything under it', () => {
  test('a cashier cannot change prices, add products or import stock', () => {
    ['Sales User', 'Desk User', 'Employee', 'Guest'].forEach((role) => {
      expect(can(role, '/products')).toBe(true);
      expect(can(role, '/products/update-price')).toBe(false);
      expect(can(role, '/products/new')).toBe(false);
      expect(can(role, '/products/bulk-stock-import')).toBe(false);
    });
  });

  test('a cashier can sell and look up sales, but not refund or edit them', () => {
    expect(can('Sales User', '/sales/pos')).toBe(true);
    expect(can('Sales User', '/sales/invoice/ACC-SINV-0001')).toBe(true);
    expect(can('Sales User', '/sales/returns')).toBe(false);
    expect(can('Sales User', '/sales/invoice/ACC-SINV-0001/edit')).toBe(false);
  });

  test('a cashier cannot move stock or set customer credit', () => {
    expect(can('Sales User', '/inventory/material-issue')).toBe(false);
    expect(can('Sales User', '/inventory/stock-entry')).toBe(false);
    expect(can('Desk User', '/customers/credit')).toBe(false);
  });

  test('read-only roles cannot raise purchases', () => {
    ['Auditor', 'Accounts User', 'Expense Approver', 'Analytics'].forEach((role) => {
      expect(can(role, '/purchases/PUR-0001')).toBe(true);
      expect(can(role, '/purchases/new')).toBe(false);
      expect(can(role, '/purchases/create-order')).toBe(false);
    });
  });

  test("a ':id' screen does not open the 'new' screen beside it", () => {
    expect(can('Sales User', '/inventory/multi-level-reconciliation/MLR-1/stock-take')).toBe(true);
    expect(can('Sales User', '/inventory/multi-level-reconciliation/new')).toBe(false);
    expect(can('Stock Manager', '/inventory/multi-level-reconciliation/new')).toBe(true);
  });
});

describe('roles keep the access they are meant to have', () => {
  test('managers keep their whole area', () => {
    expect(can('Sales Manager', '/sales/returns')).toBe(true);
    expect(can('Sales Manager', '/products/update-price')).toBe(true);
    expect(can('Purchase Manager', '/purchases/create-grn')).toBe(true);
    expect(can('Accounts Manager', '/sales/returns')).toBe(true);
  });

  test('a purchase user can still raise orders', () => {
    expect(can('Purchase User', '/purchases/create-order')).toBe(true);
    expect(can('Purchase User', '/purchases/create-grn')).toBe(false);
  });

  test('admins can open anything', () => {
    expect(can('Administrator', '/roles/new')).toBe(true);
    expect(can('System Manager', '/settings/payment-gateways')).toBe(true);
  });

  test('the All role grants nothing by itself', () => {
    expect(getAllowedRoutes(['All'])).toEqual([]);
    expect(can('All', '/dashboard')).toBe(false);
  });
});

describe('owner decisions on sensitive screens', () => {
  test('cashiers cannot adjust stock', () => {
    expect(can('Sales User', '/inventory/stock-reconciliation')).toBe(false);
  });

  test('accounts managers get finance settings only', () => {
    expect(can('Accounts Manager', '/settings/bank-accounts')).toBe(true);
    expect(can('Accounts Manager', '/settings/payment-methods')).toBe(true);
    expect(can('Accounts Manager', '/settings/payment-gateways')).toBe(false);
    expect(can('Accounts Manager', '/settings/etims')).toBe(false);
    expect(can('Accounts Manager', '/settings/business')).toBe(false);
  });

  test('stock users cannot create stores or start stock-count rounds', () => {
    expect(can('Stock User', '/inventory/stock-entry')).toBe(true);
    expect(can('Stock User', '/warehouses/new')).toBe(false);
    expect(can('Stock User', '/inventory/multi-level-reconciliation/new')).toBe(false);
    expect(can('Stock Manager', '/warehouses/new')).toBe(true);
  });

  test('auditors cannot edit bank accounts', () => {
    expect(can('Auditor', '/settings/bank-accounts')).toBe(false);
  });
});

describe('isRouteAllowed', () => {
  test('ignores a trailing slash and refuses unknown or empty input', () => {
    expect(isRouteAllowed('/dashboard/', ['/dashboard'])).toBe(true);
    expect(isRouteAllowed('/not-a-screen', ['/dashboard'])).toBe(false);
    expect(isRouteAllowed('', ['/dashboard'])).toBe(false);
    expect(isRouteAllowed(undefined, ['/dashboard'])).toBe(false);
  });
});
