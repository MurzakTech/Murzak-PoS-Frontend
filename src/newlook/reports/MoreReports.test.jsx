import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MoreReports from './MoreReports';

const show = () =>
  render(
    <MemoryRouter>
      <MoreReports />
    </MemoryRouter>
  );

test('each report is one heading that is a link, with its sentence', () => {
  show();
  const heading = screen.getByRole('heading', { level: 3, name: 'Stock summary' });
  expect(within(heading).getByRole('link', { name: 'Stock summary' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Stock summary' })).toHaveLength(1);
});

test('a report with sub-reports lists them beneath, without repeating its own name', () => {
  show();
  expect(screen.getAllByRole('link', { name: 'Stock value' })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Value by category' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Value trends' })).toBeInTheDocument();
});
