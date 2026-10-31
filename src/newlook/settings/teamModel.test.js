import { auditCsv, canUseTill, defaultRange, fieldForError, isLastOwner, personProblems, planTierChange, rolesForNewPerson, whenLabel } from './teamModel';

const tiers = {
  grant: { owner: ['System Manager'], manager: ['Sales Manager', 'Purchase Manager', 'Stock Manager', 'Accounts Manager', 'Item Manager'], cashier: ['Sales User'] },
  owner_roles: ['System Manager'],
  manager_roles: ['Accounts Manager', 'Accounts User', 'Item Manager', 'Purchase Manager', 'Sales Manager', 'Stock Manager'],
};
const person = (tier, roles, enabled = true) => ({ email: `${tier}@shop.test`, tier, roles, enabled });

describe('moving a person between kinds', () => {
  test('a cashier made a manager is given the manager roles and loses nothing', () => {
    expect(planTierChange(person('cashier', ['Sales User']), 'manager', tiers)).toEqual({ add: tiers.grant.manager, remove: [] });
  });

  test('a manager made a cashier is given the cashier role and loses every manager role', () => {
    const plan = planTierChange(person('manager', ['Sales Manager', 'Accounts User', 'Stock User']), 'cashier', tiers);
    expect(plan.add).toEqual(['Sales User']);
    expect(plan.remove.sort()).toEqual(['Accounts User', 'Sales Manager']);
  });

  test('an owner made a manager loses the owner role and is given the manager roles they lack', () => {
    const plan = planTierChange(person('owner', ['System Manager', 'Sales Manager']), 'manager', tiers);
    expect(plan.remove).toEqual(['System Manager']);
    expect(plan.add).toEqual(['Purchase Manager', 'Stock Manager', 'Accounts Manager', 'Item Manager']);
  });

  test('anyone made an owner is given the owner role and keeps the rest', () => {
    expect(planTierChange(person('manager', ['Sales Manager']), 'owner', tiers)).toEqual({ add: ['System Manager'], remove: [] });
  });

  test('a person who already has the roles of the kind needs no change', () => {
    expect(planTierChange(person('cashier', ['Sales User']), 'cashier', tiers)).toEqual({ add: [], remove: [] });
  });

  test('a new person gets the roles of their kind, as a copy', () => {
    const roles = rolesForNewPerson('manager', tiers);
    expect(roles).toEqual(tiers.grant.manager);
    roles.push('x');
    expect(tiers.grant.manager).not.toContain('x');
  });
});

test('only the one active owner is the last owner', () => {
  const owner = person('owner', ['System Manager']);
  expect(isLastOwner(owner, [owner, person('cashier', [])])).toBe(true);
  expect(isLastOwner(owner, [owner, { ...person('owner', ['System Manager']), email: 'b@shop.test' }])).toBe(false);
  expect(isLastOwner(owner, [owner, { ...person('owner', ['System Manager'], false), email: 'b@shop.test' }])).toBe(true);
  expect(isLastOwner(person('manager', []), [owner])).toBe(false);
});

describe('till access', () => {
  test('follows the table the app already uses to show or hide the till', () => {
    expect(canUseTill(['System Manager'])).toBe(true);
    expect(canUseTill(['Sales User'])).toBe(true);
    expect(canUseTill(['Sales Manager'])).toBe(true);
    expect(canUseTill(['Purchase Manager'])).toBe(false);
    expect(canUseTill([])).toBe(false);
  });
});

describe('the add and change form', () => {
  const good = { firstName: 'Juma', lastName: 'Kamau', email: 'juma@shop.test', phone: '', password: 'longenough', tier: 'cashier' };
  test('accepts a complete form', () => {
    expect(personProblems(good, true)).toEqual({});
  });
  test('asks for names, a real email and a password of 8 characters when adding', () => {
    expect(personProblems({ ...good, firstName: ' ', lastName: '', email: 'x', password: 'short' }, true)).toEqual({ firstName: 'firstNameMissing', lastName: 'lastNameMissing', email: 'emailWrong', password: 'passwordShort' });
    expect(personProblems({ ...good, email: '' }, true)).toEqual({ email: 'emailMissing' });
  });
  test('when changing, the email and password are not asked for', () => {
    expect(personProblems({ ...good, email: '', password: '' }, false)).toEqual({});
  });
  test('a phone number, if given, has at least 10 digits', () => {
    expect(personProblems({ ...good, phone: '0712 345 678' }, false)).toEqual({});
    expect(personProblems({ ...good, phone: '12345' }, false)).toEqual({ phone: 'phoneWrong' });
    expect(personProblems({ ...good, phone: 'abc' }, false)).toEqual({ phone: 'phoneWrong' });
  });
});

test('a server sentence is matched to the field it is about', () => {
  expect(fieldForError('A staff member with this email address already exists.')).toBe('email');
  expect(fieldForError('Password must be at least 8 characters long.')).toBe('password');
  expect(fieldForError('Please provide a valid phone number.')).toBe('phone');
  expect(fieldForError('You cannot give roles you do not hold yourself: Sales Manager.')).toBe('');
});

describe('the audit trail file', () => {
  const header = ['When', 'Person', 'Email', 'What happened', 'Area', 'Document type', 'Document', 'Details'];
  test('quotes every cell so commas, quotes and line breaks survive', () => {
    const csv = auditCsv([{ timestamp: '2026-10-16 08:12:44', user_name: 'Amina', user: 'a@shop.test', action: 'Created', module: 'Selling', doctype: 'POS Invoice', docname: 'INV-1', summary: 'Said "hi", then\nleft' }], header);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('"When","Person","Email","What happened","Area","Document type","Document","Details"');
    expect(csv).toContain('"Said ""hi"", then\nleft"');
  });
  test('falls back to the email when a person has no name', () => {
    expect(auditCsv([{ user: 'a@shop.test', action: 'Signed in' }], header)).toContain('"a@shop.test","a@shop.test","Signed in"');
  });
});

test('a time is written day first, and a strange value is left as it came', () => {
  expect(whenLabel('2026-10-16 08:12:44')).toBe('16/10/2026 08:12');
  expect(whenLabel('2026-10-16T08:12:44')).toBe('16/10/2026 08:12');
  expect(whenLabel('yesterday')).toBe('yesterday');
  expect(whenLabel(null)).toBe('');
});

test('the first range is the last seven days, today included', () => {
  expect(defaultRange(new Date(2026, 9, 17))).toEqual({ from: '2026-10-11', to: '2026-10-17' });
  expect(defaultRange(new Date(2026, 2, 3))).toEqual({ from: '2026-02-25', to: '2026-03-03' });
});

describe('makePassword', () => {
  const { makePassword } = require('./teamModel');
  const counter = () => {
    let n = 0;
    return (max) => {
      n += 7;
      return n % max;
    };
  };

  test('is twelve letters and digits with a capital, a small letter and a digit, and none of the look-alikes', () => {
    for (let run = 0; run < 50; run += 1) {
      const text = makePassword();
      expect(text).toMatch(/^[A-Za-z2-9]{12}$/);
      expect(text).toMatch(/[A-Z]/);
      expect(text).toMatch(/[a-z]/);
      expect(text).toMatch(/[2-9]/);
      expect(text).not.toMatch(/[0O1lI]/);
    }
  });

  test('is different each time', () => {
    expect(new Set(Array.from({ length: 30 }, () => makePassword())).size).toBe(30);
  });

  test('uses the source of randomness it is given, so a test can fix it', () => {
    expect(makePassword(counter())).toBe(makePassword(counter()));
    expect(makePassword(counter(), 16)).toHaveLength(16);
  });
});
