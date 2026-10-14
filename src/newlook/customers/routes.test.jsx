/**
 * The addresses of the Customers pages (ticket P4-7): the list, the Owing tab, the New and Edit forms, and that the old Customer
 * Credit address (which becomes /customers/owing) lands on the Owing tab.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { newLookRoutes } from '../newLookRoutes';
import OwingRedirect from './OwingRedirect';
import PagePlaceholder from '../redirects/PagePlaceholder';

const Where = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
};

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/new-look/customers/owing" element={<OwingRedirect />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

describe('the Owing address', () => {
  test('opens the Owing tab of the Customers page', () => {
    renderAt('/new-look/customers/owing');
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/customers?tab=owing');
  });

  test('a customer in the address opens that customer\'s panel', () => {
    renderAt('/new-look/customers/owing?customer=CUST-0007');
    expect(screen.getByTestId('where')).toHaveTextContent('/new-look/customers?tab=owing&open=CUST-0007');
  });
});

describe('the routes', () => {
  const find = (path) => newLookRoutes.filter((r) => r.path === path);

  test('the list, the Owing address, the New form and the Edit form each have one route of their own', () => {
    ['/new-look/customers', '/new-look/customers/owing', '/new-look/customers/new', '/new-look/customers/:id/edit'].forEach((path) => {
      expect(find(path)).toHaveLength(1);
      expect(find(path)[0].element).not.toBe(PagePlaceholder);
    });
  });

  test('no address is registered twice, so no placeholder hides a real page', () => {
    const paths = newLookRoutes.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
