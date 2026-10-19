/**
 * The line-art pictures for empty screens: decoration only, in place of the icon.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

test.each(['sales', 'products', 'customers'])('the %s picture replaces the icon and is hidden from screen readers', (art) => {
  const { container } = render(<EmptyState art={art} title="Nothing yet" description="Add one." />);
  expect(container.querySelector('svg.nl-art')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelector('.nl-empty__icon')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeInTheDocument();
});

test('an unknown picture name shows nothing extra and an error state always keeps its alert icon', () => {
  const { container, rerender } = render(<EmptyState art="unicorn" icon="box" title="Nothing yet" />);
  expect(container.querySelector('svg.nl-art')).toBeNull();
  rerender(<EmptyState art="sales" tone="error" icon="alert" title="We could not load this" />);
  expect(container.querySelector('svg.nl-art')).toBeNull();
  expect(container.querySelector('.nl-empty__icon')).not.toBeNull();
});
