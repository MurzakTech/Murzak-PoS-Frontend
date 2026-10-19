/**
 * The shop's chosen background: patterns in CSS, one photo from the self-hosted library, nothing for Plain, and only decoration.
 */
import React from 'react';
import { render } from '@testing-library/react';
import Backdrop from './Backdrop';

const layer = (name) => render(<Backdrop name={name} />).container.firstChild;

test.each(['waves', 'weave', 'sunrise', 'market'])('%s draws a hidden decorative layer', (name) => {
  const el = layer(name);
  expect(el).toHaveClass('nl-bd', `nl-bd--${name}`);
  expect(el).toHaveAttribute('aria-hidden', 'true');
});

test('plain draws nothing', () => {
  expect(layer('plain')).toBeNull();
});

test('an unknown or missing name gives the default soft waves', () => {
  expect(layer('fireworks')).toHaveClass('nl-bd--waves');
  expect(render(<Backdrop />).container.firstChild).toHaveClass('nl-bd--waves');
});
