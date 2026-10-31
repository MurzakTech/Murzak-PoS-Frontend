/* eslint-disable testing-library/no-node-access -- a card, a row or a table row is found from its own heading or name with closest(), because none of them has a role or label of its own to ask for */
/**
 * Settings, Team and security, People (ticket P5-3, AC-32): the team with each person's role (Owner, Manager or Cashier), till
 * access and status; add, change and deactivate through the existing staff calls; errors beside the field; owners only for
 * changes, a manager can look.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import TeamPeople from './TeamPeople';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const TIERS = {
  grant: { owner: ['System Manager'], manager: ['Sales Manager', 'Purchase Manager', 'Stock Manager', 'Accounts Manager', 'Item Manager'], cashier: ['Sales User'] },
  owner_roles: ['System Manager'],
  manager_roles: ['Accounts Manager', 'Accounts User', 'Item Manager', 'Purchase Manager', 'Sales Manager', 'Stock Manager'],
};
const member = (over) => ({ email: 'x@shop.test', first_name: 'X', last_name: 'Y', full_name: 'X Y', phone: '', enabled: true, tier: 'cashier', roles: ['Sales User'], created: null, last_sign_in: null, ...over });
const AMINA = member({ email: 'amina@shop.test', first_name: 'Amina', last_name: 'Otieno', full_name: 'Amina Otieno', tier: 'owner', roles: ['System Manager'] });
const JUMA = member({ email: 'juma@shop.test', first_name: 'Juma', last_name: 'Kamau', full_name: 'Juma Kamau', phone: '0712345678', tier: 'manager', roles: ['Sales Manager', 'Sales User'] });
const ZAWADI = member({ email: 'zawadi@shop.test', first_name: 'Zawadi', last_name: 'Mwangi', full_name: 'Zawadi Mwangi' });
const BARAKA = member({ email: 'baraka@shop.test', first_name: 'Baraka', last_name: 'Ouma', full_name: 'Baraka Ouma', enabled: false, roles: ['Purchase Manager'], tier: 'manager' });

const data = (members = [AMINA, JUMA, ZAWADI, BARAKA], me = 'amina@shop.test') => ({
  company: 'Shop A',
  me,
  members,
  counts: { total: members.length, active: members.filter((m) => m.enabled).length },
  tiers: TIERS,
});

const show = (props = {}, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">
          <TeamPeople load={jest.fn().mockResolvedValue(data())} {...props} />
        </AccessProvider>
      </MemoryRouter>
    </Provider>
  );
};

const rowOf = (name) => screen.getByText(name, { selector: '.nl-settings-person__name' }).closest('tr');
const openMenu = async (name) => {
  userEvent.click(within(rowOf(name)).getByRole('button', { name: `More actions for ${name.replace(' (you)', '')}` }));
};

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

describe('the list', () => {
  test('shows each person with their role, till access and whether they are active', async () => {
    show();
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    expect(within(rowOf('Amina Otieno (you)')).getByText('Owner')).toBeInTheDocument();
    expect(within(rowOf('Juma Kamau')).getByText('Manager')).toBeInTheDocument();
    expect(within(rowOf('Juma Kamau')).getByText('Can use the till')).toBeInTheDocument();
    expect(within(rowOf('Zawadi Mwangi')).getByText('Cashier')).toBeInTheDocument();
    expect(within(rowOf('Baraka Ouma')).getByText('No till')).toBeInTheDocument();
    expect(within(rowOf('Baraka Ouma')).getByText('Deactivated')).toBeInTheDocument();
    expect(within(rowOf('Amina Otieno (you)')).getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('3 active of 4')).toBeInTheDocument();
  });

  test('does not print anyone\'s login email under their name', async () => {
    show();
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    ['amina@shop.test', 'juma@shop.test', 'zawadi@shop.test', 'baraka@shop.test'].forEach((email) => expect(screen.queryByText(email)).not.toBeInTheDocument());
  });

  test('asks for the team of the signed-in business', async () => {
    const load = jest.fn().mockResolvedValue(data());
    show({ load });
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    expect(load).toHaveBeenCalledWith({ company: 'Shop A' });
  });

  test('has real header cells', async () => {
    show();
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    ['Person', 'Role', 'Till', 'Status'].forEach((name) => expect(screen.getByRole('columnheader', { name })).toBeInTheDocument());
  });

  test('a manager can look but not change: no Add, no row menu', async () => {
    show({}, 'manager');
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    expect(screen.queryByRole('button', { name: 'Add a person' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More actions for/ })).not.toBeInTheDocument();
    expect(screen.getByText('Only the business owner can add or change people.')).toBeInTheDocument();
  });

  test('someone who may not see the team is told so', async () => {
    show({ load: jest.fn().mockRejectedValue(new Error('Only an owner or a manager can see the team.')) }, 'cashier');
    expect(await screen.findByText('Only an owner or a manager can see the team.')).toBeInTheDocument();
  });

  test('a failed load says so and tries again', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('We could not reach the Murzak server.')).mockResolvedValue(data());
    show({ load });
    expect(await screen.findByRole('heading', { name: 'We could not load the team' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' })).toBeInTheDocument();
  });

  test('an empty team names the next action', async () => {
    show({ load: jest.fn().mockResolvedValue(data([])) });
    expect(await screen.findByText('No one here yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add a person' }).length).toBeGreaterThan(0);
  });
});

describe('adding a person', () => {
  const open = async (props) => {
    show(props);
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    userEvent.click(screen.getByRole('button', { name: 'Add a person' }));
    return screen.findByRole('dialog', { name: 'Add a person' });
  };

  test('asks for what is missing beside each field, and sends nothing', async () => {
    const create = jest.fn();
    const dialog = within(await open({ dialogApi: { create } }));
    userEvent.click(dialog.getByRole('button', { name: 'Add person' }));
    expect(await dialog.findByText('Enter the first name.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the last name.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the email.')).toBeInTheDocument();
    expect(dialog.getByText('The password needs at least 8 characters.')).toBeInTheDocument();
    expect(dialog.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true');
    expect(create).not.toHaveBeenCalled();
  });

  test('adds a cashier with the roles of a cashier, shows what to give them, then closes on Done, says Saved and reads the team again', async () => {
    const create = jest.fn().mockResolvedValue({});
    const load = jest.fn().mockResolvedValue(data());
    const dialog = within(await open({ load, dialogApi: { create } }));
    userEvent.type(dialog.getByLabelText('First name'), 'Wanjiru');
    userEvent.type(dialog.getByLabelText('Last name'), 'Njoroge');
    userEvent.type(dialog.getByLabelText('Email (they sign in with this)'), 'wanjiru@shop.test');
    userEvent.type(dialog.getByLabelText('Password for their first sign-in'), 'a-long-secret');
    userEvent.click(dialog.getByRole('button', { name: 'Add person' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith({ firstName: 'Wanjiru', lastName: 'Njoroge', email: 'wanjiru@shop.test', password: 'a-long-secret', phone: '', roles: ['Sales User'], company: 'Shop A' });
    // The list is read again at once; the page of what to give them stays open until Done
    const added = within(await screen.findByRole('dialog', { name: 'Wanjiru Njoroge was added' }));
    expect(added.getByText('wanjiru@shop.test')).toBeInTheDocument();
    expect(added.getByText('a-long-secret')).toBeInTheDocument();
    expect(added.getByText('Cashier')).toBeInTheDocument();
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    userEvent.click(added.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  test('adds a manager with the manager roles', async () => {
    const create = jest.fn().mockResolvedValue({});
    const dialog = within(await open({ dialogApi: { create } }));
    userEvent.type(dialog.getByLabelText('First name'), 'Otieno');
    userEvent.type(dialog.getByLabelText('Last name'), 'Ali');
    userEvent.type(dialog.getByLabelText('Email (they sign in with this)'), 'ali@shop.test');
    userEvent.type(dialog.getByLabelText('Password for their first sign-in'), 'a-long-secret');
    userEvent.click(dialog.getByRole('radio', { name: /^Manager/ }));
    userEvent.click(dialog.getByRole('button', { name: 'Add person' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0].roles).toEqual(TIERS.grant.manager);
  });

  test('adds an owner with every role the server names for an owner', async () => {
    const create = jest.fn().mockResolvedValue({});
    const dialog = within(await open({ dialogApi: { create } }));
    userEvent.type(dialog.getByLabelText('First name'), 'Beth');
    userEvent.type(dialog.getByLabelText('Last name'), 'Wafula');
    userEvent.type(dialog.getByLabelText('Email (they sign in with this)'), 'beth@shop.test');
    userEvent.type(dialog.getByLabelText('Password for their first sign-in'), 'a-long-secret');
    userEvent.click(dialog.getByRole('radio', { name: /^Owner/ }));
    userEvent.click(dialog.getByRole('button', { name: 'Add person' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0].roles).toEqual(TIERS.grant.owner);
    expect(await screen.findByRole('dialog', { name: 'Beth Wafula was added' })).toBeInTheDocument();
  });

  test('what each role can do is written on its card, and the owner is marked Admin', async () => {
    const dialog = within(await open({}));
    const group = dialog.getByRole('group', { name: 'What will they do?' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(within(group).getByRole('radio', { name: /^Cashier/ })).toBeChecked();
    expect(within(group).getByText('Sells at the till. Does not see profit, costs or money owed.')).toBeInTheDocument();
    expect(within(group).getByText('Sees sales, stock, profit and money owed. Cannot change the team.')).toBeInTheDocument();
    expect(within(group).getByText('Sees and can change everything, including the team and settings.')).toBeInTheDocument();
    expect(within(within(group).getByRole('radio', { name: /^Owner/ }).closest('label')).getByText('Admin')).toBeInTheDocument();
  });

  test('the role is the first thing after the email, and the optional mobile number comes last', async () => {
    const dialog = within(await open({}));
    const order = ['First name', 'Last name', 'Email (they sign in with this)', 'What will they do?', 'Password for their first sign-in', 'Mobile (optional)'];
    const nodes = order.map((name) => (name === 'What will they do?' ? dialog.getByRole('group', { name }) : dialog.getByLabelText(name)));
    nodes.slice(1).forEach((node, i) => expect(nodes[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
  });

  test('Make a password fills the box with a readable one, shows it, and that password is what is sent and shown on the next page', async () => {
    const create = jest.fn().mockResolvedValue({});
    const dialog = within(await open({ dialogApi: { create } }));
    userEvent.type(dialog.getByLabelText('First name'), 'Wanjiru');
    userEvent.type(dialog.getByLabelText('Last name'), 'Njoroge');
    userEvent.type(dialog.getByLabelText('Email (they sign in with this)'), 'wanjiru@shop.test');
    userEvent.click(dialog.getByRole('button', { name: 'Make a password for them' }));
    const box = dialog.getByLabelText('Password for their first sign-in');
    expect(box.value).toMatch(/^[A-Za-z2-9]{12}$/);
    expect(box).toHaveAttribute('type', 'text');
    expect(dialog.getByRole('checkbox', { name: 'Show the password' })).toBeChecked();
    const made = box.value;
    userEvent.click(dialog.getByRole('button', { name: 'Add person' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0].password).toBe(made);
    expect(await screen.findByText(made)).toBeInTheDocument();
  });

  test('Show the password turns the hidden box into plain text and back', async () => {
    const dialog = within(await open({}));
    const box = dialog.getByLabelText('Password for their first sign-in');
    userEvent.type(box, 'a-long-secret');
    userEvent.click(dialog.getByRole('checkbox', { name: 'Show the password' }));
    expect(box).toHaveAttribute('type', 'text');
    userEvent.click(dialog.getByRole('checkbox', { name: 'Show the password' }));
    expect(box).toHaveAttribute('type', 'password');
  });

  describe('the page shown once a person is added', () => {
    const addOne = async () => {
      const create = jest.fn().mockResolvedValue({});
      const dialog = within(await open({ dialogApi: { create } }));
      userEvent.type(dialog.getByLabelText('First name'), 'Wanjiru');
      userEvent.type(dialog.getByLabelText('Last name'), 'Njoroge');
      userEvent.type(dialog.getByLabelText('Email (they sign in with this)'), 'wanjiru@shop.test');
      userEvent.type(dialog.getByLabelText('Password for their first sign-in'), 'a-long-secret');
      userEvent.click(dialog.getByRole('button', { name: 'Add person' }));
      return within(await screen.findByRole('dialog', { name: 'Wanjiru Njoroge was added' }));
    };

    test('Copy puts the email and the first password on the clipboard and says so', async () => {
      const writeText = jest.fn().mockResolvedValue();
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const added = await addOne();
      userEvent.click(added.getByRole('button', { name: 'Copy these' }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith('Email: wanjiru@shop.test\nPassword: a-long-secret'));
      expect(await added.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    });

    test('when the browser will not copy, the person is told to copy it by hand', async () => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: jest.fn().mockRejectedValue(new Error('blocked')) }, configurable: true });
      const added = await addOne();
      userEvent.click(added.getByRole('button', { name: 'Copy these' }));
      expect(await added.findByRole('alert')).toHaveTextContent('Could not copy. Select the text and copy it.');
    });

    test('says the password is shown only once, and it is gone when the page is closed', async () => {
      const added = await addOne();
      expect(added.getByText(/this is the only time you will see it/)).toBeInTheDocument();
      userEvent.click(added.getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.queryByText('a-long-secret')).not.toBeInTheDocument();
      userEvent.click(screen.getByRole('button', { name: 'Add a person' }));
      expect(within(await screen.findByRole('dialog')).getByLabelText('Password for their first sign-in')).toHaveValue('');
    });
  });

  test('an email that already exists is said beside the email field', async () => {
    const create = jest.fn().mockRejectedValue(new Error('A staff member with this email address already exists.'));
    const dialog = within(await open({ dialogApi: { create } }));
    userEvent.type(dialog.getByLabelText('First name'), 'Wanjiru');
    userEvent.type(dialog.getByLabelText('Last name'), 'Njoroge');
    userEvent.type(dialog.getByLabelText('Email (they sign in with this)'), 'juma@shop.test');
    userEvent.type(dialog.getByLabelText('Password for their first sign-in'), 'a-long-secret');
    userEvent.click(dialog.getByRole('button', { name: 'Add person' }));
    expect(await dialog.findByText('A staff member with this email address already exists.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Email (they sign in with this)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('the password is typed into a hidden field and is not kept after the dialog closes', async () => {
    const dialog = within(await open({ dialogApi: { create: jest.fn() } }));
    expect(dialog.getByLabelText('Password for their first sign-in')).toHaveAttribute('type', 'password');
    userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Add a person' }));
    expect(within(await screen.findByRole('dialog')).getByLabelText('Password for their first sign-in')).toHaveValue('');
  });
});

describe('changing a person', () => {
  const edit = async (name, props) => {
    show(props);
    await screen.findByText(name, { selector: '.nl-settings-person__name' });
    await openMenu(name);
    userEvent.click(await screen.findByRole('menuitem', { name: 'Change details or role' }));
    return within(await screen.findByRole('dialog', { name: `Change ${name.replace(' (you)', '')}` }));
  };

  test('changing a name sends only the name, and no role change', async () => {
    const update = jest.fn().mockResolvedValue({});
    const add = jest.fn();
    const remove = jest.fn();
    const dialog = await edit('Zawadi Mwangi', { dialogApi: { update, add, remove } });
    const first = dialog.getByLabelText('First name');
    userEvent.clear(first);
    userEvent.type(first, 'Zawadi Grace');
    userEvent.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ email: 'zawadi@shop.test', firstName: 'Zawadi Grace', lastName: 'Mwangi', phone: '' }));
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  test('the phone number is shown as 0712 345 678 and a name change sends the number as it was stored', async () => {
    const update = jest.fn().mockResolvedValue({});
    const dialog = await edit('Juma Kamau', { dialogApi: { update, add: jest.fn(), remove: jest.fn() } });
    expect(dialog.getByLabelText('Mobile (optional)')).toHaveValue('0712 345 678');
    const first = dialog.getByLabelText('First name');
    userEvent.clear(first);
    userEvent.type(first, 'Jumaa');
    userEvent.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ email: 'juma@shop.test', firstName: 'Jumaa', lastName: 'Kamau', phone: '0712345678' }));
  });

  test('the email cannot be changed', async () => {
    const dialog = await edit('Zawadi Mwangi', {});
    expect(dialog.getByLabelText('Email (they sign in with this)')).toHaveAttribute('readonly');
    expect(dialog.queryByLabelText('Password for their first sign-in')).not.toBeInTheDocument();
  });

  test('making a cashier a manager gives the manager roles and takes nothing away', async () => {
    const add = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const update = jest.fn();
    const dialog = await edit('Zawadi Mwangi', { dialogApi: { add, remove, update } });
    userEvent.click(dialog.getByRole('radio', { name: /^Manager/ }));
    userEvent.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(add).toHaveBeenCalledWith({ email: 'zawadi@shop.test', roles: TIERS.grant.manager }));
    expect(remove).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  test('making a manager a cashier gives the cashier role first, then takes the manager roles away', async () => {
    const order = [];
    const add = jest.fn().mockImplementation(async () => order.push('add'));
    const remove = jest.fn().mockImplementation(async () => order.push('remove'));
    const dialog = await edit('Juma Kamau', { dialogApi: { add, remove, update: jest.fn() } });
    userEvent.click(dialog.getByRole('radio', { name: /^Cashier/ }));
    userEvent.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith({ email: 'juma@shop.test', roles: ['Sales Manager'] }));
    expect(add).not.toHaveBeenCalled(); // Juma already holds Sales User, so nothing is added
    expect(order).toEqual(['remove']);
  });

  test('if giving the new roles is refused, nothing is taken away and the refusal is said in the dialog', async () => {
    const add = jest.fn().mockRejectedValue(new Error('You cannot give roles you do not hold yourself: Item Manager.'));
    const remove = jest.fn();
    const dialog = await edit('Zawadi Mwangi', { dialogApi: { add, remove, update: jest.fn() } });
    userEvent.click(dialog.getByRole('radio', { name: /^Manager/ }));
    userEvent.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('You cannot give roles you do not hold yourself');
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('a person cannot change their own role', async () => {
    const dialog = await edit('Amina Otieno (you)', {});
    dialog.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    expect(dialog.getByText('You cannot do this to yourself.')).toBeInTheDocument();
  });

  test('the only active owner cannot be moved down', async () => {
    const dialog = await edit('Amina Otieno', { load: jest.fn().mockResolvedValue(data([AMINA, ZAWADI], 'zawadi@shop.test')) });
    dialog.getAllByRole('radio').forEach((radio) => expect(radio).toBeDisabled());
    expect(dialog.getByText('This is the only active owner, so this cannot be done.')).toBeInTheDocument();
  });

  test('other roles are still given one by one on the current Staff screen', async () => {
    const dialog = await edit('Zawadi Mwangi', {});
    expect(dialog.getByRole('link', { name: 'Open the current Staff screen' })).toHaveAttribute('href', '/staff?legacy=1');
  });
});

describe('deactivating and reactivating', () => {
  test('deactivating asks first, in words that say what happens, then deactivates', async () => {
    const deactivate = jest.fn().mockResolvedValue({});
    const load = jest.fn().mockResolvedValue(data());
    show({ api: { deactivate }, load });
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    await openMenu('Zawadi Mwangi');
    userEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    const ask = await screen.findByRole('alertdialog', { name: 'Deactivate Zawadi Mwangi?' });
    expect(within(ask).getByText(/will not be able to sign in\. Their sales and everything else they did stay as they are/)).toBeInTheDocument();
    expect(deactivate).not.toHaveBeenCalled();
    userEvent.click(within(ask).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(deactivate).toHaveBeenCalledWith('zawadi@shop.test'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(load).toHaveBeenCalledTimes(2);
  });

  test('Cancel deactivates no one', async () => {
    const deactivate = jest.fn();
    show({ api: { deactivate } });
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    await openMenu('Zawadi Mwangi');
    userEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(deactivate).not.toHaveBeenCalled();
  });

  test('a refusal from the server is said in words on the card', async () => {
    const deactivate = jest.fn().mockRejectedValue(new Error('Only a business owner or System Manager can do this.'));
    show({ api: { deactivate } });
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    await openMenu('Zawadi Mwangi');
    userEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Deactivate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only a business owner or System Manager can do this.');
  });

  test('you cannot deactivate yourself, and the only active owner cannot be deactivated', async () => {
    show();
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    await openMenu('Amina Otieno (you)');
    expect(await screen.findByRole('menuitem', { name: 'Deactivate' })).toBeDisabled();
  });

  test('a deactivated person can be reactivated at once', async () => {
    const reactivate = jest.fn().mockResolvedValue({});
    show({ api: { reactivate } });
    await screen.findByText('Juma Kamau', { selector: '.nl-settings-person__name' });
    await openMenu('Baraka Ouma');
    userEvent.click(await screen.findByRole('menuitem', { name: 'Reactivate' }));
    await waitFor(() => expect(reactivate).toHaveBeenCalledWith('baraka@shop.test'));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });
});
