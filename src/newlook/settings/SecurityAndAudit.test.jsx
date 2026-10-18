/* eslint-disable testing-library/no-node-access -- a card, a row or a table row is found from its own heading or name with closest(), because none of them has a role or label of its own to ask for */
/**
 * Settings, Team and security: Security, the Audit trail and the Roles link (ticket P5-3, AC-32). Security shows a yes or no
 * and links to the current screen (no code or key is typed here); the audit trail is a read-only list with Export CSV.
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { AccessProvider } from '../access/AccessProvider';
import SecurityCard from './SecurityCard';
import AuditCard from './AuditCard';
import TeamSection from './TeamSection';
import { getMyAccess } from '../../api/accessApi';

jest.mock('../../api/accessApi', () => ({ getMyAccess: jest.fn() }));

const show = (ui, tier = 'owner') => {
  getMyAccess.mockResolvedValue({ tier, can: {} });
  const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AccessProvider userKey="amina">{ui}</AccessProvider>
      </MemoryRouter>
    </Provider>
  );
};

const event = (n, over = {}) => ({ id: `E${n}`, timestamp: `2026-10-16 08:${String(10 + n).padStart(2, '0')}:00`, user: 'amina@shop.test', user_name: 'Amina Otieno', action: 'Created', module: 'Selling', doctype: 'POS Invoice', docname: `INV-${n}`, summary: `Sale ${n}, "paid"`, ...over });

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
});

describe('Security', () => {
  test('says whether two-step sign-in is on, with a word and an icon, and the other protections', async () => {
    show(<SecurityCard load={jest.fn().mockResolvedValue(true)} />);
    expect(await screen.findByText('On')).toBeInTheDocument();
    expect(screen.getByText('After 5 wrong passwords or codes within 15 minutes, the account is locked for 15 minutes.')).toBeInTheDocument();
    expect(screen.getByText(/A device left untouched for \d+ minutes signs out on its own/)).toBeInTheDocument();
  });

  test('says Off when it is off', async () => {
    show(<SecurityCard load={jest.fn().mockResolvedValue(false)} />);
    expect(await screen.findByText('Off')).toBeInTheDocument();
  });

  test('turning it on or off stays on the current screen: a link, and no code or key field here', async () => {
    show(<SecurityCard load={jest.fn().mockResolvedValue(false)} />);
    await screen.findByText('Off');
    expect(screen.getByRole('link', { name: 'Open security' })).toHaveAttribute('href', '/settings/security?legacy=1');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/code|key|secret/i)).not.toBeInTheDocument();
  });

  test('a failed check says so without breaking the card', async () => {
    show(<SecurityCard load={jest.fn().mockRejectedValue(new Error('x'))} />);
    expect(await screen.findByText('We could not check this just now.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open security' })).toBeInTheDocument();
  });
});

describe('Audit trail', () => {
  const now = new Date(2026, 9, 17);

  test('asks the existing call for the last seven days of the signed-in business, 50 at a time', async () => {
    const load = jest.fn().mockResolvedValue({ events: [event(1)], hasMore: false });
    show(<AuditCard load={load} now={now} />);
    await screen.findByText('INV-1', { exact: false });
    expect(load).toHaveBeenCalledWith({ company: 'Shop A', from_date: '2026-10-11', to_date: '2026-10-17', limit_start: 0, limit_page_length: 50 });
  });

  test('is a read-only list: when, person, what happened, document and details, with real header cells', async () => {
    show(<AuditCard load={jest.fn().mockResolvedValue({ events: [event(1), event(2, { action: 'Cancelled', user_name: '', user: 'juma@shop.test' })], hasMore: false })} now={now} />);
    await screen.findByText('16/10/2026 08:11');
    ['When', 'Person', 'What happened', 'Document', 'Details'].forEach((name) => expect(screen.getByRole('columnheader', { name })).toBeInTheDocument());
    expect(screen.getByText('POS Invoice INV-1')).toBeInTheDocument();
    expect(screen.getByText('juma@shop.test')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|delete|save/i })).not.toBeInTheDocument();
  });

  test('Show more adds the next 50 below the first', async () => {
    const load = jest
      .fn()
      .mockResolvedValueOnce({ events: [event(1)], hasMore: true })
      .mockResolvedValueOnce({ events: [event(2)], hasMore: false });
    show(<AuditCard load={load} now={now} />);
    userEvent.click(await screen.findByRole('button', { name: 'Show more' }));
    await screen.findByText('POS Invoice INV-2');
    expect(load.mock.calls[1][0]).toMatchObject({ limit_start: 1 });
    expect(screen.getByText('POS Invoice INV-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  test('Export CSV gives a file of the rows shown, every cell quoted, named for the dates', async () => {
    const save = jest.fn();
    show(<AuditCard load={jest.fn().mockResolvedValue({ events: [event(1)], hasMore: false })} save={save} now={now} />);
    await screen.findByText('POS Invoice INV-1');
    userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(save).toHaveBeenCalledTimes(1);
    const [text, name] = save.mock.calls[0];
    expect(name).toBe('audit-trail_2026-10-11_to_2026-10-17.csv');
    expect(text.startsWith('﻿"When","Person","Email"')).toBe(true);
    expect(text).toContain('"Sale 1, ""paid"""');
  });

  test('Export CSV is off when there is nothing to export', async () => {
    show(<AuditCard load={jest.fn().mockResolvedValue({ events: [], hasMore: false })} now={now} />);
    expect(await screen.findByText('Nothing matches these dates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  test('a new range is asked for again', async () => {
    const load = jest.fn().mockResolvedValue({ events: [], hasMore: false });
    show(<AuditCard load={load} now={now} />);
    const from = await screen.findByLabelText('From');
    expect(from).toHaveValue('11/10/2026');
    userEvent.clear(from);
    userEvent.type(from, '01102026');
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ from_date: '2026-10-01', to_date: '2026-10-17' })));
  });

  test('a date still being typed is not asked for, and says what is wrong beside the field', async () => {
    const load = jest.fn().mockResolvedValue({ events: [], hasMore: false });
    show(<AuditCard load={load} now={now} />);
    const from = await screen.findByLabelText('From');
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    userEvent.clear(from);
    userEvent.type(from, '0110');
    expect(await screen.findByText('Enter the date as day, month, year.')).toBeInTheDocument();
    // Every question the server was asked had a real start date
    expect(load.mock.calls.every((call) => call[0].from_date)).toBe(true);
  });

  test('someone who may not see it is told in words, and can try again', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('You do not have permission to do this. Ask the business owner or an admin for access.')).mockResolvedValue({ events: [event(1)], hasMore: false });
    show(<AuditCard load={load} now={now} />);
    expect(await screen.findByText('We could not load this list')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('POS Invoice INV-1')).toBeInTheDocument();
  });
});

describe('the whole Team section', () => {
  const props = () => ({ people: { load: jest.fn().mockResolvedValue({ company: 'Shop A', me: 'a@shop.test', members: [], counts: { total: 0, active: 0 }, tiers: { grant: {}, owner_roles: [], manager_roles: [] } }) }, security: { load: jest.fn().mockResolvedValue(true) }, audit: { load: jest.fn().mockResolvedValue({ events: [], hasMore: false }) } });

  test('holds People, Roles and permissions, Security and the Audit trail', async () => {
    show(<TeamSection {...props()} />);
    expect(await screen.findByRole('heading', { name: 'Audit trail' })).toBeInTheDocument();
    ['People', 'Roles and permissions', 'Security'].forEach((name) => expect(screen.getByRole('heading', { name })).toBeInTheDocument());
  });

  test('Roles and permissions opens the current screen', async () => {
    show(<TeamSection {...props()} />);
    expect(screen.getByRole('link', { name: 'Open Roles and permissions' })).toHaveAttribute('href', '/roles?legacy=1');
  });

  test('a role named in the address (the old Roles address) outlines the roles card', () => {
    show(<TeamSection {...props()} search="?open=Sales%20Manager" />);
    expect(within(screen.getByRole('link', { name: 'Open Roles and permissions' }).closest('li')).getByText(/The three roles above/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Roles and permissions' }).closest('li')).toHaveAttribute('aria-current', 'true');
  });

  test('a cashier does not get the list, only a link to the current Audit trail screen (an auditor counts as a cashier)', async () => {
    const audit = { load: jest.fn() };
    show(<TeamSection {...props()} audit={audit} />, 'cashier');
    expect(await screen.findByRole('link', { name: 'Open Audit trail' })).toHaveAttribute('href', '/settings/audit-trail?legacy=1');
    expect(screen.queryByRole('columnheader', { name: 'When' })).not.toBeInTheDocument();
    expect(audit.load).not.toHaveBeenCalled();
  });

  test('nothing is asked of the audit trail until it is known who is asking', () => {
    const audit = { load: jest.fn() };
    getMyAccess.mockReturnValue(new Promise(() => {}));
    const store = configureStore({ reducer: { auth: () => ({ user: { company: 'Shop A' } }) } });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <AccessProvider userKey="amina">
            <TeamSection {...props()} audit={audit} />
          </AccessProvider>
        </MemoryRouter>
      </Provider>
    );
    expect(audit.load).not.toHaveBeenCalled();
  });
});
