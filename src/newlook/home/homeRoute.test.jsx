/**
 * The page at Home chooses between the full Home and the role Home from the person's access.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import HomeRoute from './HomeRoute';

const mockAccess = { current: { tier: 'owner' } };
const mockUser = { current: { roles: [] } };
jest.mock('../access/AccessProvider', () => ({ useAccess: () => mockAccess.current }));
jest.mock('../../store/hooks', () => ({ useAppSelector: (select) => select({ auth: { user: mockUser.current } }) }));
jest.mock('./HomePage', () => () => <p>full home</p>);
jest.mock('./RoleDashboard', () => () => <p>role home</p>);

const pick = (tier, roles) => {
  mockAccess.current = { tier };
  mockUser.current = { roles };
  render(<HomeRoute />);
};

test('an owner gets the full Home whatever roles are listed', () => {
  pick('owner', ['Sales User']);
  expect(screen.getByText('full home')).toBeInTheDocument();
});

test('a role that opens every page gets the full Home', () => {
  pick('manager', ['Business Owner']);
  expect(screen.getByText('full home')).toBeInTheDocument();
});

test('a person whose roles cannot be read keeps the full Home', () => {
  pick(null, []);
  expect(screen.getByText('full home')).toBeInTheDocument();
});

test('everyone else gets the role Home', () => {
  pick('cashier', ['Purchase User']);
  expect(screen.getByText('role home')).toBeInTheDocument();
});
