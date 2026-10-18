/**
 * Ticket P5-4, acceptance check AC-33: the "Set up now" banner on Home appears only for a NEW store, with the New look on, to the
 * owner; "Not now" is remembered on this device for 7 days; a shop with data, or with the New look off, never sees it.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SetupBanner from './SetupBanner';
import { isSnoozed } from './setupModel';
import { useNewLook } from '../NewLookProvider';

jest.mock('../NewLookProvider', () => ({ useNewLook: jest.fn() }));

const state = (over = {}) => ({ offer: true, needsSetup: true, inProgress: false, canEdit: true, doneSteps: [], skippedSteps: [], ...over });
const DAY = 24 * 60 * 60 * 1000;

const show = (answer, props = {}) => {
  const load = jest.fn().mockResolvedValue(answer);
  const view = render(
    <MemoryRouter initialEntries={['/new-look']}>
      <Routes>
        <Route path="/new-look" element={<SetupBanner load={load} {...props} />} />
        <Route path="/new-look/setup" element={<p>The wizard</p>} />
      </Routes>
    </MemoryRouter>
  );
  return { load, ...view };
};

beforeEach(() => {
  localStorage.clear();
  useNewLook.mockReturnValue({ enabled: true, status: 'ready', company: 'Shop A' });
});

test('a new store is invited to set up, and "Set up now" opens the wizard', async () => {
  show(state());
  expect(await screen.findByRole('heading', { name: 'Set up your shop' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Set up now' }));
  expect(await screen.findByText('The wizard')).toBeInTheDocument();
});

test('a shop that has started is invited to carry on', async () => {
  show(state({ needsSetup: false, inProgress: true, doneSteps: ['business'] }));
  expect(await screen.findByRole('heading', { name: 'Finish setting up your shop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Carry on' })).toBeInTheDocument();
});

test('an existing shop with data never sees it (the server does not offer it)', async () => {
  const { load } = show(state({ offer: false, needsSetup: false }));
  await waitFor(() => expect(load).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Set up now' })).not.toBeInTheDocument();
  expect(screen.queryByText('Set up your shop')).not.toBeInTheDocument();
});

test('only the owner is invited', async () => {
  const { load } = show(state({ canEdit: false }));
  await waitFor(() => expect(load).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Set up now' })).not.toBeInTheDocument();
});

test('with the New look off it asks the server nothing and shows nothing', () => {
  useNewLook.mockReturnValue({ enabled: false, status: 'ready', company: 'Shop A' });
  const { load } = show(state());
  expect(load).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Set up now' })).not.toBeInTheDocument();
});

test('"Not now" hides it and is remembered on this device for 7 days', async () => {
  const first = show(state());
  userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
  expect(screen.queryByRole('button', { name: 'Set up now' })).not.toBeInTheDocument();
  expect(isSnoozed('Shop A', Date.now() + 6 * DAY)).toBe(true);
  first.unmount();

  // A visit within the week: asked, but not shown
  const again = show(state());
  await waitFor(() => expect(again.load).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Set up now' })).not.toBeInTheDocument();
  again.unmount();

  // After the week it is back
  show(state(), { now: Date.now() + 8 * DAY });
  expect(await screen.findByRole('button', { name: 'Set up now' })).toBeInTheDocument();
});

test('another shop on the same device is not hidden by this shop\'s "Not now"', async () => {
  const first = show(state());
  userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
  first.unmount();
  useNewLook.mockReturnValue({ enabled: true, status: 'ready', company: 'Shop B' });
  show(state());
  expect(await screen.findByRole('button', { name: 'Set up now' })).toBeInTheDocument();
});

test('if the server cannot be asked, Home simply goes without the banner', async () => {
  const load = jest.fn().mockRejectedValue(new Error('offline'));
  render(
    <MemoryRouter>
      <SetupBanner load={load} />
    </MemoryRouter>
  );
  await waitFor(() => expect(load).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Set up now' })).not.toBeInTheDocument();
});
